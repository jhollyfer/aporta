/**
 * Enforces the `_standards/backend.md` conventions that ESLint does not reach.
 *
 * ESLint already enforces the four writing rules (ternary, `any`, `as`,
 * `interface`) and the prohibition of `new` on a service. What is left is what depends on
 * knowing *where* the file is and *what it is called* — class name derived from the
 * path, a layer that cannot import another, pagination envelope, soft
 * delete scope. A lint rule does not solve this without inventing a plugin; a small
 * script does.
 *
 * Each rule points to the section of the standard it originates from, so that the error message
 * carries the decision along and not only the symptom.
 *
 * Usage:
 *   node --import @poppinss/ts-exec scripts/pattern-check.ts            # fails
 *   node --import @poppinss/ts-exec scripts/pattern-check.ts --report   # measures only
 */

import { access, readdir, readFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import string from '@adonisjs/core/helpers/string'

import {
  configuration,
  type PatternCheckConfiguration,
} from './pattern-check.config.ts'

/** The fields are those of `_standards/backend.md` §10, in Portuguese by definition. */
type Finding = {
  file: string
  line: number
  rule: string
  section: string
  message: string
}

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..')

/** Directories the standard requires even when empty. Section 1.1. */
const REQUIRED_DIRECTORIES = [
  'app/core',
  'app/domain',
  'app/repositories',
  'app/features',
  'app/exceptions',
  'app/models',
  'app/services',
  'app/middleware',
  'app/guards',
  'app/policies',
] as const

const CONFIGURATION: PatternCheckConfiguration = configuration
const CONFIGURATION_FILE = 'scripts/pattern-check.config.ts'

const IGNORED = new Set([
  'node_modules',
  'build',
  '.adonisjs',
  'tmp',
  '.git',
  'coverage',
])

async function listTsFiles(dir: string): Promise<string[]> {
  const found: string[] = []
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return found
  }

  for (const entry of entries) {
    if (IGNORED.has(entry.name)) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...(await listTsFiles(path)))
      continue
    }
    if (entry.name.endsWith('.ts')) found.push(path)
  }

  return found
}

/**
 * Removes line and block comments before matching a pattern. Without this, every
 * example inside a JSDoc — and this project has many — would become a violation.
 */
export function stripComments(source: string): string {
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, (chunk) =>
    chunk.replace(/[^\n]/g, ' '),
  )
  return withoutBlocks.replace(
    /(^|[^:])\/\/.*$/gm,
    (_match, prefix: string) => prefix,
  )
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length
}

/**
 * `paginate.controller.ts` -> `Paginate`. The case change is that of
 * `@adonisjs/core/helpers/string`, the same one the controllers index uses.
 */
function verbOf(file: string): string {
  return string.pascalCase(
    basename(file).replace(/\.(controller|use-case)\.ts$/, ''),
  )
}

/**
 * The names the path authorizes: one with the last directory as it is on disk,
 * another with it in the singular. Outside `app/features/` there is no path to
 * derive from, and the rule does not apply.
 */
function derivedNames(relativePath: string, suffix: string): string[] {
  const inside = relativePath.split('app/features/')[1]
  if (inside === undefined) return []

  // `<module>/<resource>/<action>/<action>.controller.ts`: the action folder repeats the
  // file verb and does not enter the name twice.
  const parts = inside.split('/')
  const dirs = parts.slice(0, -2)
  if (dirs.length === 0) return []

  const verb = verbOf(relativePath)
  // The singular is a heuristic, and assumed as such: that is why the rule accepts the
  // segment with and without it.
  const literal = dirs.map((dir) => string.pascalCase(dir)).join('')
  const last = dirs.length - 1
  const withSingular = dirs
    .map((dir, index) => {
      if (index === last) return string.pascalCase(string.singular(dir))
      return string.pascalCase(dir)
    })
    .join('')

  return [
    ...new Set([
      `${literal}${verb}${suffix}`,
      `${withSingular}${verb}${suffix}`,
    ]),
  ]
}

type Rule = {
  name: string
  section: string
  /** Matches on the source already stripped of comments. */
  pattern: RegExp
  message: string
  /** When present, the rule only runs on files whose path matches. */
  scope?: RegExp
}

const RULES: Rule[] = [
  {
    name: 'policy-outside-bouncer',
    section: '4.6',
    // The per-record rule goes through `ctx.bouncer.with(Policy)` in the controller,
    // the mechanism the Bouncer docs document. A policy injected into the use-case and
    // a method called directly is the fifth path the standard refuses.
    scope: /app\/features\/.*\.use-case\.ts$/,
    pattern: /from\s+'#policies\//,
    message:
      'authorize in the controller with `ctx.bouncer.with(Policy)`; the use-case receives the already authorized record',
  },
  {
    name: 'context-serializer',
    section: '4.5',
    pattern: /\b(?:ctx|context)\.serialize\b/,
    message:
      '`context.serialize` was removed along with the `api_provider`; the envelope is `{ meta, data }` built in the use-case',
  },
  {
    name: 'local-pagination-constant',
    section: '4.5',
    scope: /app\/features\//,
    pattern: /^\s*const\s+(?:PAGE|PER_PAGE)\s*=/m,
    message: 'the pagination default is not redeclared per use-case',
  },
  {
    name: 'actor-as-id',
    section: '4.3',
    scope: /\.use-case\.ts$/,
    pattern: /\bactor\s*:\s*string\b/,
    message:
      '`actor` is the `User` object, not the id: the policy receives (actor, target)',
  },
  {
    name: 'throw-in-use-case',
    section: '4.2',
    scope: /\.use-case\.ts$/,
    pattern: /\bthrow\b|\bPromise\.reject\(/,
    message:
      'a business failure is `left(HTTPException...)`, never `throw`; `throw` is for bugs only; `Promise.reject` is the same `throw`',
  },
  {
    name: 'throw-in-repository',
    section: '4.2',
    // The contract returns `null` or the fact; whoever decides what is an error is the use-case.
    scope: /^app\/repositories\/(?!.*\.spec\.ts$)/,
    pattern: /\bthrow\b|\bPromise\.reject\(/,
    message:
      'a repository does not `throw`: return `null` or the contract result (`RepositoryFailure` for an infrastructure failure); `Promise.reject` is the same `throw`',
  },
  {
    name: 'raw-input-in-controller',
    section: '4.1',
    // One way of reading the input: `request.validateUsing(<Validator>)`, params via
    // `{ data: context.params }`. Never `request.body()`, `qs()`, `params()`,
    // `all()` nor `V.validate(request.body())`.
    scope: /^app\/.*\.controller\.ts$/,
    pattern:
      /(?<!\.\.\.\s*)\b(?:context|ctx)\.request\.(?:body|qs|params|all|input)\(|\.validate\(\s*(?:context|ctx)\.params\b/,
    message:
      'read the input with `context.request.validateUsing(<Validator>)` (params in `{ data: context.params }`), never `request.body()`, `qs()`, `params()` or a raw `context.params`',
  },
  {
    name: 'raw-body-spread',
    section: '4.1',
    scope: /^app\/.*\.controller\.ts$/,
    pattern: /\.\.\.\s*(?:context|ctx)\.request\.(?:body|all|qs|params)\(/,
    message:
      'spreading the raw body into the payload is mass assignment; the use-case receives only the validator output',
  },
  {
    name: 'core-imports-upper-layer',
    section: '1.3',
    // `core/` depends on nothing from the project (`architecture.md` §2); the
    // cross-cutting spec that lives there is test infrastructure, not the core.
    scope: /^app\/core\/(?!.*\.spec\.ts$)/,
    pattern:
      /from\s+'#(?:features|services|models|exceptions|policies|middleware|config|start)\//,
    message: '`app/core/` does not import from any other layer of the project',
  },
  {
    name: 'domain-imports-layer',
    section: '1.3',
    // `domain/` is the center (`architecture.md` §2, `domain.md` §1): it does not know that
    // database, HTTP, framework or schema library exist. The spec alongside
    // stays out; it is a test, not the layer.
    scope: /^app\/domain\/(?!.*\.spec\.ts$)/,
    pattern:
      /from\s+'(?:#(?:models|repositories|services|features|exceptions|policies|middleware|validators|config|start)\/|@adonisjs\/|@vinejs\/|zod')/,
    message:
      '`app/domain/` imports only `@aporta/shared`, `#core/*` and the domain itself; a domain fact, never `HTTPException`',
  },
  {
    name: 'repository-imports-layer',
    section: '1.3',
    // `repositories/` knows domain, models and core (`architecture.md` §2):
    // business rules and HTTP stay out, and so does I/O service.
    scope: /^app\/repositories\/(?!.*\.spec\.ts$)/,
    pattern:
      /from\s+'#(?:features|services|exceptions|policies|middleware|validators)\//,
    message:
      '`app/repositories/` imports only `#domain/*`, `#models/*`, `#core/*` and shared',
  },
  {
    name: 'feature-imports-implementation',
    section: '1.3',
    // The feature depends on the contract (`architecture.md` §2); whoever chooses the
    // implementation is the provider. The unit test is the exception: it builds the use-case with
    // the in-memory implementation (`backend.md` §2.1).
    scope: /^app\/features\/(?!.*\.unit\.spec\.ts$)/,
    pattern: /from\s+'#repositories\/[^']*\.(?:lucid|memory)\.repository'/,
    message:
      'import the contract `#repositories/<entity>/<entity>.repository`; the implementation is bound in the provider',
  },
  {
    name: 'or-fail-in-use-case',
    section: '4.2',
    // `*OrFail()` is `throw` by another name: it falls into the global handler and becomes 500
    // where there should be a 404. The contract returns `null` and the use-case decides.
    scope: /\.(?:use-case|repository)\.ts$/,
    pattern: /\b\w+OrFail\(/,
    message:
      'replace `*OrFail()` with `find`/`first` and return `left(HTTPException.NotFound(...))` in the use-case',
  },
  {
    name: 'vine-outside-core',
    section: '4.4',
    // Only `app/core/validator.ts` imports the package: it is through it that the messages and
    // the date transform hold in every schema. `@vinejs/vine/types` is a type, and
    // also comes out of `#core/validator` (`Infer`).
    scope: /^(?!app\/core\/validator\.ts$)/,
    pattern: /from\s+'@vinejs\/vine(?:\/[^']*)?'/,
    message:
      'import `vine` and `Infer` from `#core/validator`, never from `@vinejs/vine`',
  },
  {
    name: 'validator-outside-resource',
    section: '4.4',
    // A resource validator lives in `<resource>.validator.ts`; the global ones, in
    // `app/core/validator.ts`; the OpenAPI response registry, in `scripts/openapi/`.
    // Controller, use-case and service do not declare a schema.
    scope:
      /^app\/(?!core\/validator\.ts$)(?!validators\/[^/]+\/[^/]+\.validator\.ts$)/,
    pattern: /\bvine\.create\(/,
    message:
      'a VineJS schema lives in `app/validators/<module>/<resource>.validator.ts`',
  },
  {
    name: 'service-imports-feature',
    section: '1.3',
    scope: /app\/services\//,
    // `#features/_shared.<theme>` stays out: it is the declared place of the shared pure
    // function, and importing it couples the service to no feature. What the
    // rule refuses is depending on a module — `#features/administrator/...`.
    pattern: /from\s+'#features\/(?!_shared\.)/,
    message:
      '`app/services/` does not import from a features module (only from `_shared.<theme>`)',
  },
]

export function applyRules(relativePath: string, source: string): Finding[] {
  const findings: Finding[] = []
  const clean = stripComments(source)

  for (const rule of RULES) {
    if (rule.scope !== undefined && !rule.scope.test(relativePath)) continue
    const match = rule.pattern.exec(clean)
    if (match === null) continue
    findings.push({
      file: relativePath,
      line: lineOf(clean, match.index),
      rule: rule.name,
      section: rule.section,
      message: rule.message,
    })
  }

  return findings
}

/**
 * The exported class derives from the whole path, and not just the verb.
 *
 * The suffix alone let through what appeared most: `NoticeUpdateController`
 * in a file under `administrator/notices/` ends in `UpdateController` and
 * still loses the module. Without the module the name does not say which route group the
 * class belongs to - and `administrator/notices` and `storefront/notices` are two
 * different use cases over the same table, with different authorization.
 *
 * Singularization remains a heuristic, and that is why it **does not decide**: the
 * rule accepts both the segment as it is on disk and its singular form.
 * Both derive from the path deterministically; which of the two the project uses
 * is a style choice, and neither lets the module be forgotten.
 */
export function checkClassName(
  relativePath: string,
  source: string,
): Finding[] {
  const isController = relativePath.endsWith('.controller.ts')
  const isUseCase = relativePath.endsWith('.use-case.ts')
  if (!isController && !isUseCase) return []
  if (relativePath.includes('.spec.')) return []

  const clean = stripComments(source)
  const declaration = /export\s+default\s+class\s+([A-Za-z0-9_]+)/.exec(clean)
  if (declaration === null) return []

  const name = declaration[1] ?? ''
  let suffix = 'UseCase'
  if (isController) suffix = 'Controller'

  const accepted = derivedNames(relativePath, suffix)
  if (accepted.length === 0) return []
  if (accepted.includes(name)) return []

  return [
    {
      file: relativePath,
      line: lineOf(clean, declaration.index),
      rule: 'class-name',
      section: '3',
      message: `class \`${name}\` should be \`${accepted.join('` or `')}\`, derived from the path`,
    },
  ]
}

/**
 * An action is a folder, always: `<module>/<resource>/<action>/<action>.{controller,use-case}.ts`
 * (`architecture.md` §3). A loose action file in the resource, or in a folder that does not
 * repeat the verb, is where the action spec stops having a home.
 */
export function checkActionFolder(relativePath: string): Finding[] {
  const match =
    /^app\/features\/(.+)\/([a-z-]+)\.(controller|use-case|e2e\.spec|unit\.spec)\.ts$/.exec(
      relativePath,
    )
  if (match === null) return []

  const [, directory = '', verb] = match
  const parts = directory.split('/')
  if (parts.length === 3 && parts[2] === verb) return []

  // The module's cross-cutting spec - the one that asserts the same thing about several
  // of its resources, like the route group trait - lives at the root of the
  // module and repeats its name: `app/features/storefront/storefront.e2e.spec.ts`
  // (`backend.md` §7, "a cross-cutting spec sits next to what it covers"). Only the spec:
  // loose controller and use-case in the module remain homeless.
  if (match[3]?.endsWith('spec') && parts.length === 1 && parts[0] === verb)
    return []

  return [
    {
      file: relativePath,
      line: 1,
      rule: 'action-outside-folder',
      section: '1.2',
      message: `the action lives in \`app/features/<module>/<resource>/${verb}/${verb}.*.ts\``,
    },
  ]
}

/** A model in `app/models/` uses kebab-case. Section 3. */
function checkModelName(relativePath: string): Finding[] {
  if (!relativePath.startsWith('app/models/')) return []
  if (!basename(relativePath).includes('_')) return []
  const suggested = basename(relativePath).replace(/_/g, '-')
  return [
    {
      file: relativePath,
      line: 1,
      rule: 'model-snake-case',
      section: '3',
      message: `model uses kebab-case: rename to \`${suggested}\``,
    },
  ]
}

/**
 * Every key read by `env.get()` is declared in the schema, and vice versa. Section 6.
 *
 * A `config/*.ts` may carry a commented-out driver block, and that is why the
 * read ignores comments: `DB_HOST` in there is not a real key.
 *
 * A declared key that nobody reads is a dead key, and goes away. The way out is
 * `envOutsideCode`, for what never goes through `env.get()` - `PORT` and `HOST` are
 * read from `process.env` by `@adonisjs/core`, and `TZ` by Node itself.
 */
async function checkEnv(files: string[]): Promise<Finding[]> {
  let schema: string

  try {
    schema = await readFile(join(ROOT, 'start/env.ts'), 'utf8')
  } catch {
    return []
  }

  const declared = new Set<string>()
  for (const match of stripComments(schema).matchAll(
    /^\s*([A-Z][A-Z0-9_]*)\s*:/gm,
  )) {
    if (match[1] !== undefined) declared.add(match[1])
  }

  const findings: Finding[] = []
  const seen = new Set<string>()

  const readKeys = new Set<string>()

  for (const file of files) {
    const relativePath = relative(ROOT, file)
    if (relativePath === 'start/env.ts') continue
    const clean = stripComments(await readFile(file, 'utf8'))

    // A direct read of `process.env` bypasses the reader: it only holds for what
    // is registered in `envOutsideCode`, with the reason.
    for (const match of clean.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
      const key = match[1]
      if (key === undefined) continue
      if (CONFIGURATION.envOutsideCode[key] !== undefined) continue
      findings.push({
        file: relativePath,
        line: lineOf(clean, match.index),
        rule: 'env-outside-reader',
        section: '6',
        message: `\`${key}\` is read from \`process.env\` without going through \`start/env.ts\`; declare it in the schema or register it in \`envOutsideCode\``,
      })
    }

    for (const match of clean.matchAll(/env\.get\(\s*'([A-Z][A-Z0-9_]*)'/g)) {
      const key = match[1]
      if (key === undefined) continue
      readKeys.add(key)
      if (declared.has(key) || seen.has(key)) continue
      seen.add(key)
      findings.push({
        file: relativePath,
        line: lineOf(clean, match.index),
        rule: 'env-without-schema',
        section: '6',
        message: `\`${key}\` is read here and is not declared in \`start/env.ts\``,
      })
    }
  }

  const cleanSchema = stripComments(schema)

  for (const key of declared) {
    if (readKeys.has(key)) continue
    if (CONFIGURATION.envOutsideCode[key] !== undefined) continue
    findings.push({
      file: 'start/env.ts',
      line: lineOf(cleanSchema, cleanSchema.indexOf(key)),
      rule: 'env-without-reader',
      section: '6',
      message: `\`${key}\` is declared and nobody reads it; remove it, or register it in \`envOutsideCode\` of \`${CONFIGURATION_FILE}\``,
    })
  }

  return findings
}

async function checkDirectories(): Promise<Finding[]> {
  const findings: Finding[] = []
  for (const dir of REQUIRED_DIRECTORIES) {
    try {
      await readdir(join(ROOT, dir))
    } catch {
      findings.push({
        file: dir,
        line: 1,
        rule: 'required-directory',
        section: '1.1',
        message:
          'a cross-cutting directory exists from the start, even when empty',
      })
    }
  }
  return findings
}

/**
 * A configuration path, like that of `use-case` under `app/features`, becoming an
 * expression.
 *
 * Two stars followed by a slash match any depth, including
 * none; a lone star matches within a single segment. It is the minimum the three
 * paths in the list ask for.
 */
function globPattern(glob: string): RegExp {
  const body = glob
    .split('**/')
    .map((chunk) =>
      chunk.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*'),
    )
    .join('(?:.*/)?')
  return new RegExp(`^${body}$`)
}

/**
 * Every `newAllowlist` entry describes a use that exists.
 *
 * ESLint already refuses `new X()` where `X` ends in Service, UseCase, Policy or
 * Controller (section 2.1). The configuration is where the exceptions are named
 * with the reason beside them, and what is enforced here is the other side of the list: an entry without use.
 *
 * It exists because the list was a dead letter — no function read it. An exception that
 * nobody exercises is not an exception, and is a false statement about the code; and whoever reads
 * the standard believes it. That is how `Bouncer` stayed on the list for years describing
 * a call that no use case made.
 */
function checkNewAllowlist(sources: Map<string, string>): Promise<Finding[]> {
  const findings: Finding[] = []

  for (const entry of CONFIGURATION.newAllowlist) {
    const target = globPattern(entry.file)
    const usage = new RegExp(`\\bnew\\s+${entry.symbol}\\s*\\(`)

    let used = false
    for (const [relativePath, source] of sources) {
      if (!target.test(relativePath)) continue
      if (!usage.test(source)) continue
      used = true
      break
    }

    if (used) continue
    findings.push({
      file: CONFIGURATION_FILE,
      line: 1,
      rule: 'unused-new-allowlist',
      section: '2.1',
      message: `\`newAllowlist\` exempts \`new ${entry.symbol}\` in \`${entry.file}\`, and there is no such use; remove the entry or fix the path`,
    })
  }

  return Promise.resolve(findings)
}

/**
 * Soft delete goes through `withScopes(notDeleted)` or `withScopes(onlyDeleted)`,
 * never through a hand-written `whereNull`/`whereNotNull`.
 *
 * The rule of section 4.8, enforced. Their cost was not the keyboard: a hand-written filter depends on
 * someone remembering, and the query that forgets returns an archived record without
 * warning. Centralized, there is nothing to forget.
 *
 * `app/models/` stays out because that is where the scope lives - and its body is what
 * writes the `whereNull`, once. The other exceptions are named in
 * `softDeleteExempt` in the configuration, and are always the same situation: a query over a
 * generic `LucidModel`, a type in which a named scope does not exist.
 */
function checkSoftDelete(sources: Map<string, string>): Promise<Finding[]> {
  const exempt = new Set(CONFIGURATION.softDeleteExempt)
  const findings: Finding[] = []
  const pattern = /where(?:Not)?Null\(\s*'(?:deletedAt|deleted_at)'\s*\)/

  for (const [relativePath, source] of sources) {
    if (relativePath.startsWith('app/models/')) continue
    if (exempt.has(relativePath)) continue

    const match = pattern.exec(source)

    if (match === null) continue

    findings.push({
      file: relativePath,
      line: lineOf(source, match.index),
      rule: 'soft-delete-without-scope',
      section: '4.8',
      message:
        'use `withScopes((scopes) => scopes.notDeleted())` (or `onlyDeleted()`, or `scopes.trashed(mode)` for `?trashed`); if the query is about a generic `LucidModel`, name the file in `softDeleteExempt`',
    })
  }

  return Promise.resolve(findings)
}

/**
 * A feature does not import a model or Lucid (`architecture.md` §2): the use-case talks
 * to the repository and the entity, and only `app/repositories/` knows the model.
 *
 * The spec stays out: the E2E reads the real state in the database to prove it wrote
 * (`backend.md` §7). No exemption: every resource goes through the repository
 * (`backend.md` §11.1, step 5).
 */
export function checkFeatureModelImport(
  sources: Map<string, string>,
): Finding[] {
  const findings: Finding[] = []
  const pattern = /from\s+'(?:#models\/|@adonisjs\/lucid)/

  for (const [relativePath, source] of sources) {
    if (!relativePath.startsWith('app/features/')) continue
    if (relativePath.endsWith('.spec.ts')) continue

    const match = pattern.exec(source)
    if (match === null) continue

    findings.push({
      file: relativePath,
      line: lineOf(source, match.index),
      rule: 'feature-imports-model',
      section: '1.3',
      message:
        'the use-case talks to the `#repositories/*` contract and the `#domain/*` entity; model and Lucid stay in the repository implementation',
    })
  }

  return findings
}

/**
 * The FORM paths of the configuration exist in this repository.
 *
 * FORM is the middle category of section 5: same public API and same structure,
 * content per domain. No sha256 comparison enforces them precisely because the
 * content differs - and that is why nobody enforced anything, and a project could lose the
 * whole file without failing.
 *
 * Presence is what can be enforced without inventing: if `app/services/storage/storage.service.ts`
 * disappears, the rule points it out instead of the difference showing up the day someone
 * goes looking for the service the standard guarantees.
 */
async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function checkShape(): Promise<Finding[]> {
  const findings: Finding[] = []

  for (const path of CONFIGURATION.shape) {
    if (await exists(join(ROOT, path))) continue

    findings.push({
      file: CONFIGURATION_FILE,
      line: 1,
      rule: 'missing-shape',
      section: '5',
      message: `\`${path}\` is a SHAPE in the configuration and does not exist here; create the file or remove the path from \`shape\``,
    })
  }

  return findings
}

/**
 * The use case declares `type Payload` and `type Response = Either<...>`.
 *
 * It is not aesthetics: the two types are the use case contract, and they are what makes the
 * sibling controller and `openapi/introspect.ts` know what goes in and what comes out.
 * Using the validator type directly in the signature works until the day the use
 * case needs one more field - `actor`, almost always -, and then the change
 * happens in the signature instead of the alias, where nobody looks.
 *
 * `type Payload` is only required when `execute` receives something: a use
 * case without input has no payload to declare, and requiring the empty alias would be
 * ceremony.
 *
 * Not covered by `_doc-lib/` - it is a convention of this standard, section 4.2.
 */
export function checkUseCaseShape(
  relativePath: string,
  source: string,
): Finding[] {
  if (!relativePath.endsWith('.use-case.ts')) return []
  if (!relativePath.includes('app/features/')) return []

  const clean = stripComments(source)
  const findings: Finding[] = []

  // A template method subclass (`backend.md` §4.2): the `execute`, with the
  // `Payload` and the `Response`, lives in the base in `_shared.<theme>.ts`.
  if (/export\s+default\s+class\s+\w+\s+extends\s+\w+UseCase</.test(clean))
    return findings

  const execute = /async execute\(([^)]*)\)/.exec(clean)
  const receivesInput = execute !== null && (execute[1] ?? '').trim().length > 0

  if (receivesInput && !/^type Payload\b/m.test(clean)) {
    findings.push({
      file: relativePath,
      line: lineOf(clean, execute.index),
      rule: 'use-case-without-payload',
      section: '4.2',
      message:
        'declare `type Payload` at the top and use it in the signature; the validator type used directly has nowhere to receive `actor`',
    })
  }

  const response = /^type Response = Either</m.exec(clean)

  if (response === null) {
    findings.push({
      file: relativePath,
      line: 1,
      rule: 'use-case-without-response',
      section: '4.2',
      message: 'declare `type Response = Either<HTTPException, T>` at the top',
    })
  }

  return findings
}

/**
 * Every controller is reachable by some route.
 *
 * The registry in `.adonisjs/server/controllers.ts` is derived from the **file
 * system**, and not from the routes: existing there does not mean being exposed. And the
 * other guards read `openapi.json`, which only has registered routes - so a
 * whole resource without routes passed through all of them.
 *
 * It has happened: a whole resource of controllers and use cases without a route, and the
 * count of controllers against operations still closed by coincidence
 * (routed controllers that served two routes each offset the orphans).
 *
 * Unreachable code is not neutral. That one had drifted from the standard while
 * nobody looked - it used `userId: string` where section 4.3 asks for the `User` object -,
 * and one day it would resurface looking ready.
 */
async function checkRoute(files: string[]): Promise<Finding[]> {
  const routes = await readFile(join(ROOT, 'start/routes.ts'), 'utf8')
  const findings: Finding[] = []

  for (const file of files) {
    const relativePath = relative(ROOT, file)
    if (!relativePath.endsWith('.controller.ts')) continue

    const inside = relativePath.split('app/features/')[1]
    if (inside === undefined) continue

    // The generated index nests each folder, including the action one:
    // `administrator/notices/archive/archive.controller.ts` becomes
    // `controllers.administrator.notices.archive.Archive`.
    const parts = inside.split('/')
    const verb = string.pascalCase(
      (parts.at(-1) ?? '').replace('.controller.ts', ''),
    )
    const folders = parts.slice(0, -1).map((folder) => string.camelCase(folder))
    const key = ['controllers', ...folders, verb].join('.')

    // Identifier boundary, and not `includes`: `controllers.account.Show`
    // would match inside `controllers.account.ShowX`, and the rule would go green for
    // a controller that no route reaches. It is what the sensor caught in the
    // first version of this function.
    const reference = new RegExp(`${key.replace(/\./g, '\\.')}(?![A-Za-z0-9_])`)

    if (reference.test(routes)) continue

    findings.push({
      file: relativePath,
      line: 1,
      rule: 'controller-without-route',
      section: '1.2',
      message: `no route references \`${key}\`; register the route or delete the file and the sibling use-case`,
    })
  }

  return findings
}

/**
 * `actor` is the name of whoever acts, in the use-case `Payload` (`backend.md` §4.3).
 * `user`, `userId`, `createdBy` and `ownerId` are the same data under another name, and
 * escape the `(actor, target)` policy.
 */
export function checkActorName(
  relativePath: string,
  source: string,
): Finding[] {
  if (!relativePath.endsWith('.use-case.ts')) return []
  if (!relativePath.startsWith('app/features/')) return []

  const clean = stripComments(source)
  const start = clean.search(/^type Payload\b/m)
  if (start < 0) return []

  const end = clean.indexOf('\n\n', start)
  let payload = clean.slice(start)
  if (end >= 0) payload = clean.slice(start, end)

  const match =
    /\b(user|userId|createdBy|ownerId|currentUser|author|authorId)\??\s*:/.exec(
      payload,
    )
  if (match === null) return []

  return [
    {
      file: relativePath,
      line: lineOf(clean, start + match.index),
      rule: 'actor-renamed',
      section: '4.3',
      message: `\`${match[1]}\` in the \`Payload\` is the \`actor\` under another name; whoever acts is called \`actor\``,
    },
  ]
}

/**
 * A controller on the `bouncerRequired` list authorizes per record with `ctx.bouncer`
 * (`backend.md` §4.6): an authenticated route with a per-record rule that is not just
 * ownership cannot answer without the policy's `authorize`/`execute`.
 *
 * The list is project data and an entry without a controller is a false statement, which is
 * why the missing file also fails.
 */
export function checkBouncerRequired(
  entries: PatternCheckConfiguration['bouncerRequired'],
  sources: Map<string, string>,
): Finding[] {
  const findings: Finding[] = []

  for (const entry of entries) {
    const source = sources.get(entry.file)

    if (source === undefined) {
      findings.push({
        file: CONFIGURATION_FILE,
        line: 1,
        rule: 'bouncer-required-without-controller',
        section: '4.6',
        message: `\`${entry.file}\` is in \`bouncerRequired\` and does not exist; fix the path or remove the entry`,
      })
      continue
    }

    if (
      /\bbouncer\s*\.\s*with\(|\bbouncer\s*\.\s*(?:authorize|allows|denies|execute)\(|\.authorize\(/.test(
        source,
      )
    )
      continue

    findings.push({
      file: entry.file,
      line: 1,
      rule: 'bouncer-required',
      section: '4.6',
      message: `route with a per-record rule (${entry.reason}) without \`ctx.bouncer\`; authorize through the policy in the controller`,
    })
  }

  return findings
}

/**
 * Applies the temporary `pattern-check` exceptions: a finding whose rule and
 * file are in the list disappears, and an entry that no finding used fails (an
 * unused exception is a false statement about the code; `architecture.md` §6).
 *
 * The `depcruise` entries do not go through here; see `checkDepcruiseExceptions`.
 */
export function applyTemporaryExceptions(
  findings: Finding[],
  exceptions: PatternCheckConfiguration['temporaryExceptions'],
): Finding[] {
  const own = exceptions.filter((entry) => entry.check === 'pattern-check')
  const used = new Set<(typeof own)[number]>()

  const kept = findings.filter((finding) => {
    const entry = own.find(
      (item) => item.rule === finding.rule && item.file === finding.file,
    )
    if (entry === undefined) return true
    used.add(entry)
    return false
  })

  for (const entry of own) {
    if (used.has(entry)) continue
    kept.push({
      file: CONFIGURATION_FILE,
      line: 1,
      rule: 'unused-temporary-exception',
      section: '10',
      message: `\`temporaryExceptions\` exempts \`${entry.rule}\` in \`${entry.file}\` (batch ${entry.batch}), and there is no such finding; remove the entry`,
    })
  }

  return kept
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * A `depcruise` exception describes an import that exists: the importing file
 * cites the target. Without this the list would be left over after the batch fixes the import.
 */
export function checkDepcruiseExceptions(
  exceptions: PatternCheckConfiguration['temporaryExceptions'],
  sources: Map<string, string>,
): Finding[] {
  const findings: Finding[] = []

  for (const entry of exceptions) {
    if (entry.check !== 'depcruise') continue
    const source = sources.get(entry.file)
    const target = (entry.target ?? '')
      .replace(/^app\//, '')
      .replace(/\.ts$/, '')
    const specifier = escapeRegExp(`#${target}`)
    const relativeSpecifier = escapeRegExp(`/${basename(target)}`)
    const alias = new RegExp(
      `from\\s+'(?:${specifier}|\\.[^']*${relativeSpecifier})(?:\\.js|\\.ts)?'`,
    )

    if (source !== undefined && alias.test(source)) continue
    findings.push({
      file: CONFIGURATION_FILE,
      line: 1,
      rule: 'unused-temporary-exception',
      section: '10',
      message: `\`temporaryExceptions\` exempts \`${entry.file}\` -> \`${entry.target}\` (batch ${entry.batch}), and there is no such import; remove the entry`,
    })
  }

  return findings
}

/**
 * Each finding is `{ file, line, rule, section, message }`, grouped by the
 * section of the violated standard - the format common to every `scripts/<name>-check.ts`
 * (`_standards/backend.md` §10).
 */
function report(findings: Finding[]): void {
  if (findings.length === 0) {
    process.stdout.write('pattern:check: no violations.\n')
    return
  }

  process.stdout.write(`pattern:check: ${findings.length} violations\n\n`)

  const bySection = Map.groupBy(findings, (finding) => finding.section)
  const sections = [...bySection.keys()].sort((leftKey, rightKey) =>
    leftKey.localeCompare(rightKey, 'pt-BR', { numeric: true }),
  )

  for (const section of sections) {
    process.stdout.write(`  _standards/backend.md §${section}\n`)
    for (const finding of bySection.get(section) ?? []) {
      process.stdout.write(
        `${`    ${finding.file}:${finding.line}  [${finding.rule}] ${finding.message}`}\n`,
      )
    }
    process.stdout.write('\n')
  }
}

async function main(): Promise<void> {
  const flags = new Set(process.argv.slice(2))
  const files = await listTsFiles(ROOT)
  const findings: Finding[] = [...(await checkDirectories())]

  const sources = new Map<string, string>()

  for (const file of files) {
    const relativePath = relative(ROOT, file)
    if (relativePath.startsWith('scripts/')) continue
    const source = await readFile(file, 'utf8')
    sources.set(relativePath, stripComments(source))
    findings.push(...applyRules(relativePath, source))
    findings.push(...checkClassName(relativePath, source))
    findings.push(...checkModelName(relativePath))
    findings.push(...checkActionFolder(relativePath))
    findings.push(...checkUseCaseShape(relativePath, source))
    findings.push(...checkActorName(relativePath, source))
  }

  findings.push(...(await checkEnv(files)))
  findings.push(...(await checkNewAllowlist(sources)))
  findings.push(...(await checkSoftDelete(sources)))
  findings.push(...checkFeatureModelImport(sources))
  findings.push(...(await checkShape()))
  findings.push(...(await checkRoute(files)))
  findings.push(...checkBouncerRequired(CONFIGURATION.bouncerRequired, sources))
  findings.push(
    ...checkDepcruiseExceptions(CONFIGURATION.temporaryExceptions, sources),
  )

  const remaining = applyTemporaryExceptions(
    findings,
    CONFIGURATION.temporaryExceptions,
  )
  report(remaining)

  if (flags.has('--report')) return
  if (remaining.length > 0) process.exitCode = 1
}

// Imported by the spec (`pattern-check.unit.spec.ts`), the file only exposes the
// rules; the check runs when it is the process.
if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
