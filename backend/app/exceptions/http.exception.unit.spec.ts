import { readFile, readdir } from 'node:fs/promises'

import app from '@adonisjs/core/services/app'
import { LOCALE, LOCALES } from '@aporta/shared'
import { test } from '@japa/runner'
import ts from 'typescript'

import { icuVariables, readLang } from '#tests/lang-fixtures'

/**
 * `resources/lang/<locale>/errors.json` against the code (`_standards/i18n.md` §4).
 *
 * The key is the exception's `code`. The code is the source of truth for the list: the
 * `code` of each `HTTPException.Factory(Translation.t('errors.CODE'), 'CODE')` and the
 * `errors.CODE` keys read directly (the global handler). A new code without translation, or a
 * key nobody uses anymore, is born red, and so is a message whose key is not its own code.
 */

type Usage = { code: string; messageKey: string | null; where: string }
type FieldUsage = {
  key: string
  variables: Array<string>
  where: string
}

const ROOTS = ['app', 'commands', 'providers', 'start']
const KEY_PREFIX = 'errors.'
const FIELD_PREFIX = 'fields.'
/**
 * The denials of the policy base (`session-scoped-policy.base.ts`): the
 * second argument is the `code` that becomes `errors.<CODE>`, as in a factory.
 */
const POLICY_DENIALS = new Set(['this.hidden', 'this.forbidden'])

async function sources(): Promise<Array<string>> {
  const found: Array<string> = []

  for (const root of ROOTS) {
    const listing = await readdir(app.makePath(root), {
      recursive: true,
    }).catch(() => [])

    for (const file of listing) {
      if (!file.endsWith('.ts') || file.endsWith('.spec.ts')) continue

      found.push(app.makePath(root, file))
    }
  }

  return found
}

/** The names of the variables of the `data` object of `Translation.t`, sorted. */
function variableNames(data: ts.Expression | undefined): Array<string> {
  if (data === undefined || !ts.isObjectLiteralExpression(data)) return []

  return data.properties
    .map((property) => property.name?.getText() ?? '')
    .sort()
}

/**
 * The literal of a `Translation.t('errors.X')` message argument, or `null` when the argument is
 * anything else.
 */
function literalKeyOf(message: ts.Expression | undefined): string | null {
  if (
    message === undefined ||
    !ts.isCallExpression(message) ||
    message.expression.getText() !== 'Translation.t'
  )
    return null

  const [key] = message.arguments

  if (key === undefined || !ts.isStringLiteralLike(key)) return null

  return key.text
}

function visit(node: ts.Node, each: (node: ts.Node) => void) {
  each(node)
  ts.forEachChild(node, (child) => visit(child, each))
}

/** The literal uses and the `errors.CODE` keys read directly, from the whole source. */
async function scan() {
  const calls: Array<Usage> = []
  const dynamic: Array<string> = []
  const keys: Array<string> = []
  const fields: Array<FieldUsage> = []
  const dynamicFields: Array<string> = []

  for (const file of await sources()) {
    const text = await readFile(file, 'utf8')
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
    const where = file.slice(app.makePath().length + 1)

    visit(source, (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        (node.expression.expression.getText() === 'HTTPException' ||
          POLICY_DENIALS.has(node.expression.getText()))
      ) {
        const isPolicy = POLICY_DENIALS.has(node.expression.getText())
        const [first, second] = node.arguments
        // A factory takes `(message, code)`; a policy denial takes `(code)`.
        let code = second
        let messageKey = literalKeyOf(first)

        if (isPolicy) {
          code = first
          messageKey = null
        }

        if (code !== undefined && ts.isStringLiteralLike(code)) {
          calls.push({ code: code.text, messageKey, where })
        } else {
          dynamic.push(`${where}: ${node.getText()}`)
        }
      }

      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.getText() === 'Translation.t'
      ) {
        const [key, data] = node.arguments

        if (
          key !== undefined &&
          ts.isStringLiteralLike(key) &&
          key.text.startsWith(FIELD_PREFIX)
        ) {
          fields.push({
            key: key.text.slice(FIELD_PREFIX.length),
            variables: variableNames(data),
            where,
          })
        } else if (key === undefined || !ts.isStringLiteralLike(key)) {
          dynamicFields.push(`${where}: ${node.getText()}`)
        }
      }

      if (
        ts.isStringLiteralLike(node) &&
        node.text.startsWith(KEY_PREFIX) &&
        /^errors\.[A-Z0-9_]+$/.test(node.text)
      ) {
        keys.push(node.text.slice(KEY_PREFIX.length))
      }
    })
  }

  return { calls, dynamic, keys, fields, dynamicFields }
}

const { calls, dynamic, keys, fields, dynamicFields } = await scan()
const used = new Set([...calls.map((usage) => usage.code), ...keys])

test.group('errors.json > codes in the code', () => {
  test('when scanning the source, every code used is a literal', ({
    assert,
  }) => {
    // A code assembled at runtime cannot be checked against the file.
    assert.deepEqual(dynamic, [])
  })

  test('when building a factory message, it is the translation of its own code', ({
    assert,
  }) => {
    const diverging = calls
      .filter((usage) => usage.messageKey !== null)
      .filter((usage) => usage.messageKey !== `${KEY_PREFIX}${usage.code}`)
      .map((usage) => `${usage.where}: ${usage.code} -> ${usage.messageKey}`)

    assert.deepEqual(diverging, [])
    assert.isAbove(calls.length, 30)
  })

  test('when a code is used, has a key in the three languages', async ({
    assert,
  }) => {
    for (const locale of LOCALES) {
      const messages = await readLang(locale, 'errors')
      const missing = [...used].filter((code) => !messages.has(code))

      assert.deepEqual(missing.sort(), [], locale)
    }
  })

  test('when a key exists, a code uses it so none is left over', async ({
    assert,
  }) => {
    for (const locale of LOCALES) {
      const messages = await readLang(locale, 'errors')
      const unused = [...messages.keys()].filter((key) => !used.has(key))

      assert.deepEqual(unused.sort(), [], locale)
    }
  })
})

test.group('fields.json > keys in the code', () => {
  test('when a field message is used, has a literal key', ({ assert }) => {
    assert.deepEqual(dynamicFields, [])
    assert.isAbove(fields.length, 5)
  })

  test('when a key is used, has text in the three languages', async ({
    assert,
  }) => {
    for (const locale of LOCALES) {
      const messages = await readLang(locale, 'fields')
      const missing = fields.filter((usage) => !messages.has(usage.key))

      assert.deepEqual(
        missing.map((usage) => `${usage.where}: ${usage.key}`),
        [],
        locale,
      )
    }
  })

  test('when a field message key exists, a field message uses it so none is left over', async ({
    assert,
  }) => {
    const usedKeys = new Set(fields.map((usage) => usage.key))

    for (const locale of LOCALES) {
      const messages = await readLang(locale, 'fields')
      const unused = [...messages.keys()].filter((key) => !usedKeys.has(key))

      assert.deepEqual(unused.sort(), [], locale)
    }
  })

  test('when comparing the pt-BR text, has the same variables as the call site', async ({
    assert,
  }) => {
    // The text lives in `fields.json` alone; what the call site must agree with is the
    // list of ICU variables it hands over.
    const messages = await readLang(LOCALE.PT_BR, 'fields')
    const diverging = fields
      .filter(
        (usage) =>
          icuVariables(messages.get(usage.key) ?? '').join() !==
          usage.variables.join(),
      )
      .map((usage) => `${usage.where}: ${usage.key}`)

    assert.deepEqual(diverging, [])
  })
})
