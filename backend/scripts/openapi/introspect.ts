import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import ts from 'typescript'

import { RESPONSES } from '#core/openapi/response'
import type { DocumentedValidator, ResponseSchema } from '#core/openapi/types'
import HTTPException from '#exceptions/http.exception'

/**
 * Reads the contract that the code already declares.
 *
 * This is the difference from `adonis-autoswagger`: there the documentation comes
 * from JSDoc that someone writes on the controller, so a route only shows up complete
 * if someone remembered to annotate it - and each route becomes a comment block to
 * maintain. Here the controller already says everything:
 *
 * ```ts
 * const payload = await context.request.validateUsing(NoticeCreateValidator)
 * const { id } = await context.request.validateUsing(IdentifierValidator, { data: context.params })
 * return context.response.created(result.value)
 * ```
 *
 * Payload, payload source and success status are right there, written by the
 * same code that runs in production. Reading the AST instead of asking for a declaration makes the
 * document unable to diverge: changing the controller's validator changes the
 * documentation on the next `openapi:generate`, without anyone remembering anything.
 *
 * The sibling use-case supplies the domain errors, by the same reasoning.
 */

type IntrospectedError = {
  status: number
  code: string
  message: string
}

export type Introspection = {
  /**
   * What `request.validateUsing(<Validator>)` reads: the body, or the query on a `GET`.
   * The route verb decides, in `buildContract`.
   */
  input?: DocumentedValidator
  params?: DocumentedValidator
  successStatus?: number
  errors: IntrospectedError[]
  /** `create`, `update`, `show`, `paginate`, `delete`... */
  action: string
  /** The feature directory, to find its entry in `#core/openapi/response`. */
  directory: string
}

/**
 * `response` methods that carry the status in the name. No controller in the
 * project uses `response.status(n)`, and if one starts to, the status becomes
 * undefined instead of wrong.
 */
const RESPONSE_STATUS: Readonly<Record<string, number>> = {
  ok: 200,
  created: 201,
  accepted: 202,
  noContent: 204,
}

/**
 * Status of each `HTTPException` factory, built by calling the factories
 * themselves.
 *
 * A hand-written table here would diverge the day someone changed the
 * status of a factory. Asking the object carries no such risk.
 */
function factoryStatuses(): Record<string, number> {
  const statuses: Record<string, number> = {}

  for (const name of Object.getOwnPropertyNames(HTTPException)) {
    const factory: unknown = Reflect.get(HTTPException, name)

    if (typeof factory !== 'function') continue
    if (name === 'prototype' || name === 'length' || name === 'name') continue

    try {
      const instance: unknown = Reflect.apply(factory, HTTPException, ['', ''])

      if (instance instanceof HTTPException) statuses[name] = instance.status
    } catch {
      // A factory with a signature different from the expected one: ignored, not guessed.
    }
  }

  return statuses
}

const FACTORY_STATUS = factoryStatuses()

/** `#features/<module>/<resource>/_shared.<resource>-refusal`: the translation table of the facts. */
const REFUSAL_SPECIFIER = /^#features\/.+\/_shared\.[^/]+-refusal$/

/**
 * The pt-BR text of each error `code`: the single place the message lives
 * (`resources/lang/pt-BR/errors.json`, `_standards/i18n.md` §3). The document shows the
 * pt-BR message as the example of the error body.
 */
const PT_BR_ERRORS = loadPtBrErrors()

function loadPtBrErrors(): Map<string, string> {
  const parsed: unknown = JSON.parse(
    readFileSync(
      new URL('../../resources/lang/pt-BR/errors.json', import.meta.url),
      'utf-8',
    ),
  )
  const messages = new Map<string, string>()

  if (typeof parsed !== 'object' || parsed === null) return messages

  for (const [code, message] of Object.entries(parsed)) {
    if (typeof message === 'string') messages.set(code, message)
  }

  return messages
}

// ---------------------------------------------------------------------------
// AST reading
// ---------------------------------------------------------------------------

async function parse(file: string): Promise<ts.SourceFile> {
  const source = await readFile(file, 'utf-8')

  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
}

function walk(node: ts.Node, visit: (node: ts.Node) => void) {
  visit(node)
  ts.forEachChild(node, (child) => walk(child, visit))
}

/** Identifier -> import specifier map, to resolve the validator. */
function collectImports(source: ts.SourceFile): Map<string, string> {
  const imports = new Map<string, string>()

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue

    const specifier = statement.moduleSpecifier.text
    const bindings = statement.importClause?.namedBindings

    if (statement.importClause?.name) {
      imports.set(statement.importClause.name.text, specifier)
    }

    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements)
        imports.set(element.name.text, specifier)
    }
  }

  return imports
}

function calleeText(call: ts.CallExpression): string {
  return call.expression.getText()
}

/**
 * Where the payload comes from, by the second argument of `validateUsing`.
 *
 * `{ data: context.params }` switches the source to the route parameters; without
 * options the source is the request (body, or query on a `GET`).
 */
function sourceOf(call: ts.CallExpression): 'input' | 'params' | undefined {
  if (!calleeText(call).endsWith('.validateUsing')) return undefined

  const [, options] = call.arguments

  if (
    options &&
    /\bdata\s*:\s*(?:context|ctx)\.params\b/.test(options.getText())
  )
    return 'params'

  return 'input'
}

/** The identifier of the validator used in a call. */
function validatorName(call: ts.CallExpression): string | undefined {
  const [argument] = call.arguments

  if (argument && ts.isIdentifier(argument)) return argument.text

  return undefined
}

// ---------------------------------------------------------------------------
// Validator resolution
// ---------------------------------------------------------------------------

function isValidator(value: unknown): value is DocumentedValidator {
  if (typeof value !== 'object' || value === null) return false

  return (
    'toJSONSchema' in value &&
    typeof Reflect.get(value, 'toJSONSchema') === 'function'
  )
}

/**
 * Imports the validator module and returns the exported instance.
 *
 * Relative specifiers are resolved against the controller file;
 * `#alias/...` is handed to Node, which already knows how to resolve it through the `imports` map
 * of `package.json`.
 */
async function loadValidator(
  name: string,
  specifier: string,
  from: string,
): Promise<DocumentedValidator | undefined> {
  let target = specifier

  if (specifier.startsWith('.')) {
    target = pathToFileURL(resolve(dirname(from), specifier)).href
  }

  try {
    const module: unknown = await import(target)

    if (typeof module !== 'object' || module === null) return undefined

    const exported: unknown = Reflect.get(module, name)

    if (isValidator(exported)) return exported
  } catch {
    return undefined
  }

  return undefined
}

// ---------------------------------------------------------------------------
// Use-case errors
// ---------------------------------------------------------------------------

/**
 * Collects `HTTPException.Factory(Translation.t('errors.CODE'), 'CODE')` from the sibling
 * use-case; the message is the pt-BR text of `resources/lang/pt-BR/errors.json` under that
 * code.
 *
 * Only literal arguments are read. A code built in a variable is not guessed at -
 * it would be left out and `--strict` enforces it, which is better than documenting a guess.
 */
async function readErrors(file: string): Promise<IntrospectedError[]> {
  let source

  try {
    source = await parse(file)
  } catch {
    return []
  }

  const errors: IntrospectedError[] = []
  const seen = new Set<string>()

  walk(source, function (node) {
    if (!ts.isCallExpression(node)) return

    const callee = calleeText(node)

    if (!callee.startsWith('HTTPException.')) return

    const factory = callee.slice('HTTPException.'.length)
    const status = FACTORY_STATUS[factory]

    if (!status) return

    // `(message, code, errors?)`: the message is a `Translation.t` call, so the code is the
    // second argument, and the example text comes from `errors.json` under it.
    const [, codeNode] = node.arguments

    if (!codeNode || !ts.isStringLiteralLike(codeNode)) return

    const key = `${status}:${codeNode.text}`

    if (seen.has(key)) return

    seen.add(key)
    errors.push({
      status,
      code: codeNode.text,
      message: PT_BR_ERRORS.get(codeNode.text) ?? codeNode.text,
    })
  })

  return errors
}

/**
 * The failures that the use-case translates through the `_shared.<resource>-refusal.ts` it
 * imports (`_standards/openapi.md#erros-do-use-case`). The refusal holds only the facts that the
 * resource's actions refuse in the same way, so every entry is a failure of the use-case that
 * imports it; the facts that each action translates alone stay in the use-case itself.
 */
async function readRefusalErrors(
  useCase: string,
): Promise<IntrospectedError[]> {
  let source

  try {
    source = await parse(useCase)
  } catch {
    return []
  }

  const marker = '/app/features/'
  const root = useCase.slice(0, useCase.indexOf(marker) + marker.length)
  const errors: IntrospectedError[] = []

  for (const specifier of new Set(collectImports(source).values())) {
    if (!REFUSAL_SPECIFIER.test(specifier)) continue

    const target = resolve(root, `${specifier.slice('#features/'.length)}.ts`)

    errors.push(...(await readErrors(target)))
  }

  return errors
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/**
 * From the route's `importExpression` to the controller source file.
 *
 * The router stores the text of the whole expression - `"()=>import('#features/...')"` -
 * and not just the specifier, so it is extracted from inside the `import()`.
 */
export function controllerPath(
  importExpression: string,
  appRoot: string,
): string | undefined {
  const specifier = importExpression.match(
    /import\(\s*['"]([^'"]+)['"]\s*\)/,
  )?.[1]

  if (!specifier?.startsWith('#features/')) return undefined

  const feature = specifier.slice('#features/'.length)

  return resolve(appRoot, 'app/features', `${feature}.ts`)
}

/**
 * The action's response schema, read from the `#core/openapi/response` registry.
 *
 * The key is the action path inside `app/features`, and the lookup climbs: it tries
 * `administrator/notices/show` and then `administrator/notices`
 * (`_standards/openapi.md#registro-de-resposta`). `paginate` does not climb: the
 * resource entry is the item, and a listing documented as the raw item would be a
 * wrong contract. Without its own entry it comes out with no body, and the warning fails
 * `--strict`.
 */
export function loadResponseSchema(
  directory: string,
  action: string,
  appRoot: string,
): ResponseSchema | undefined {
  const features = resolve(appRoot, 'app/features')
  const key = relative(features, directory)
  const own = RESPONSES[`${key}/${action}`]

  if (own || action === 'paginate') return own

  return RESPONSES[key]
}

export async function introspect(
  file: string,
): Promise<Introspection | undefined> {
  let source

  try {
    source = await parse(file)
  } catch {
    return undefined
  }

  const imports = collectImports(source)
  const found: Introspection = {
    errors: [],
    action: file.split('/').pop()?.replace('.controller.ts', '') ?? '',
    // The action is a folder (`<resource>/<action>/<action>.controller.ts`), and the response
    // belongs to the resource: the key climbs one level above the action folder.
    directory: dirname(dirname(file)),
  }

  const pending: Array<{ slot: 'input' | 'params'; name: string }> = []

  walk(source, function (node) {
    if (!ts.isCallExpression(node)) return

    const callee = calleeText(node)

    // `context.response.created(...)` -> 201
    const method = callee.match(/response\.([a-zA-Z]+)$/)?.[1]

    if (method && RESPONSE_STATUS[method])
      found.successStatus = RESPONSE_STATUS[method]

    const slot = sourceOf(node)

    if (!slot) return

    const name = validatorName(node)

    if (name) pending.push({ slot, name })
  })

  for (const { slot, name } of pending) {
    const specifier = imports.get(name)

    if (!specifier) continue

    const validator = await loadValidator(name, specifier, file)

    if (validator) found[slot] = validator
  }

  // The whole action folder: the use-case raises the business failure, and the
  // controller the per-record authorization one (`ctx.bouncer`, `backend.md` §4.6).
  const useCase = file.replace('.controller.ts', '.use-case.ts')

  found.errors = [
    ...(await readErrors(file)),
    ...(await readErrors(useCase)),
    ...(await readRefusalErrors(useCase)),
  ]

  return found
}
