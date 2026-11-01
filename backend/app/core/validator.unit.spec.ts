import { readdir } from 'node:fs/promises'

import app from '@adonisjs/core/services/app'
import { LOCALE, LOCALES } from '@aporta/shared'
import type { Locale } from '@aporta/shared'
import { test } from '@japa/runner'

import * as core from '#core/validator'
import { readLang } from '#tests/lang-fixtures'

/**
 * The static audits of the validators, all through `toJSONSchema()`.
 *
 * The field list comes from the validators themselves, not from a second list
 * to keep up to date - a new mismatched field is born red.
 *
 * It lives next to `app/core/validator.ts`, and not in an action folder, because
 * it checks all validators at once: what is tested is a limit that the database
 * or the API response imposes and the application must anticipate. The messages of the
 * validation provider, at the end of the file, are the same meta-spec seen from the
 * other side - the message text, not the schema. The 422 of a real route, which
 * proves the provider was installed, is `validator.e2e.spec.ts`.
 */

type Introspectable = { toJSONSchema: () => unknown }

function isValidator(value: unknown): value is Introspectable {
  if (typeof value !== 'object' || value === null) return false
  if (!('toJSONSchema' in value)) return false

  return typeof value.toJSONSchema === 'function'
}

/** The child of `node` at `key`, always as a list, so the recursion does not branch. */
function branch(node: unknown, key: string): Array<unknown> {
  if (typeof node !== 'object' || node === null) return []

  // `Reflect.get` and not an index: `key in node` narrows `node`, but does not make it
  // valid to index it by an arbitrary `string` - and the assertion that solved
  // this is rule 3 of `code-pattern`. A missing key returns `undefined`,
  // which here means the same as an empty branch.
  const value: unknown = Reflect.get(node, key)

  if (value === undefined) return []

  if (Array.isArray(value)) return value

  return [value]
}

/**
 * Every backend validator: the globals of `#core/validator` and those of each
 * `app/validators/<module>/<resource>.validator.ts`. The list comes from disk, not from an
 * import per file, so that a new validator enters the audit without
 * anyone remembering to register it here.
 */
const listing = await readdir(app.makePath('app/validators'), {
  recursive: true,
})
const files = listing.filter((file) => file.endsWith('.validator.ts'))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function load(file: string): Promise<Record<string, unknown>> {
  const loaded: unknown = await import(
    `#validators/${file.replace(/\.ts$/, '')}`
  )

  if (!isRecord(loaded)) throw new TypeError(`${file} does not export a module`)

  return loaded
}

const modules: Array<Record<string, unknown>> = [
  core,
  ...(await Promise.all(files.map((file) => load(file)))),
]

// Only the `*Validator` export (`backend.md` §4.4): whatever else the file exports
// (the `UPLOAD_MAX_SIZE` ceiling, the types) is not an input schema.
const validators = modules
  .flatMap((moduleExports) => Object.entries(moduleExports))
  .filter(([name]) => name.endsWith('Validator'))
  .map(([, validator]) => validator)
  .filter(isValidator)

/** Every path whose node is `type: 'string'`, with the node alongside. */
function strings(schema: unknown, prefix = ''): Array<[string, unknown]> {
  const found: Array<[string, unknown]> = []

  for (const each of branch(schema, 'anyOf'))
    found.push(...strings(each, prefix))
  for (const each of branch(schema, 'items'))
    found.push(...strings(each, `${prefix}[]`))

  for (const properties of branch(schema, 'properties')) {
    if (typeof properties !== 'object' || properties === null) continue

    for (const [name, child] of Object.entries(properties)) {
      const path = [prefix, name].filter(Boolean).join('.')

      if (branch(child, 'type').includes('string')) found.push([path, child])

      found.push(...strings(child, path))
    }
  }

  return found
}

/**
 * The size ceiling of every text field.
 *
 * Text columns are `varchar(255)` - which is what Knex's `table.string()`
 * creates - when the migration does not say another size. A field with no ceiling in the validator
 * lets the large value cross validation and blow up in Postgres: what
 * should be a 422 pointing at the field becomes a 500 with "internal error" on screen, and the
 * server log is the only place where what happened shows up.
 */
test.group('validator > text ceilings', () => {
  test('when a validator has a text field, has a size limit', ({ assert }) => {
    // `format` and `pattern` cover whoever already limits by another path - `email()`,
    // `uuid()` -, and `enum` is not free text.
    const unbounded = validators
      .flatMap((each) => strings(each.toJSONSchema()))
      .filter(([, node]) => {
        if (typeof node !== 'object' || node === null) return false

        return !['maxLength', 'format', 'pattern', 'enum'].some(
          (key) => key in node,
        )
      })
      .map(([path]) => path)

    assert.deepEqual([...new Set(unbounded)].sort(), [])
  })
})

/** Every field path of the schema, including nested ones (`parts.etag`). */
function walk(schema: unknown, prefix = ''): Array<string> {
  const paths: Array<string> = []

  // `anyOf` is what an object's `.optional()` produces: the object and null.
  for (const each of branch(schema, 'anyOf')) paths.push(...walk(each, prefix))
  for (const each of branch(schema, 'items')) paths.push(...walk(each, prefix))

  for (const properties of branch(schema, 'properties')) {
    if (typeof properties !== 'object' || properties === null) continue

    for (const [name, child] of Object.entries(properties)) {
      const path = [prefix, name].filter(Boolean).join('.')

      paths.push(path)
      paths.push(...walk(child, path))
    }
  }

  return paths
}

const fields = new Set(validators.flatMap((each) => walk(each.toJSONSchema())))

/**
 * Legitimate label that will never appear in `toJSONSchema()`.
 *
 * `passwordConfirmation` is not a declared field: it is born from
 * `.confirmed({ as: 'passwordConfirmation' })` in `password()`, which is a
 * rule. The error is reported under that name, so the label must exist - but the
 * schema does not know the key, and without this list the orphan test would flag it.
 */
const MISSING_FROM_SCHEMA = ['passwordConfirmation']

/**
 * The entries of `resources/lang/<locale>/validator.json` under a prefix, without
 * it: `shared.fields.name` becomes `name`.
 */
async function entriesOf(
  locale: Locale,
  prefix: 'shared.fields.' | 'shared.messages.',
): Promise<Map<string, string>> {
  const entries = await readLang(locale, 'validator')

  return new Map(
    [...entries]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, message]) => [key.slice(prefix.length), message]),
  )
}

/**
 * The friendly name of every field, in both directions and in the three languages.
 *
 * A field without a label breaks nothing - it only makes the response ask "Informe avatarId"
 * instead of "Informe o avatar". Because it breaks nothing, it goes unnoticed, and it is
 * exactly for this reason that enforcement must be automatic.
 */
test.group('validator > labels', () => {
  test('when a validator has a field, has a name in the three languages', async ({
    assert,
  }) => {
    // The raw name serves as VineJS's fallback, so it is enough for the last segment to have
    // a label - `parts.etag` falls back to `etag` if the full path is not
    // listed. Both hold, and the full path wins when it exists.
    for (const locale of LOCALES) {
      const labels = await entriesOf(locale, 'shared.fields.')
      const unlabeled = [...fields].filter((path) => {
        if (labels.has(path)) return false

        return !labels.has(path.slice(path.lastIndexOf('.') + 1))
      })

      assert.deepEqual(unlabeled.sort(), [], locale)
    }
  })

  test('when a label exists, the field still exists so no label is left over', async ({
    assert,
  }) => {
    // The opposite of the test above: a label for a field that already left the validator does not
    // warn that it is dead, and keeps being copied to the next resource.
    const leaves = new Set(
      [...fields].map((path) => path.slice(path.lastIndexOf('.') + 1)),
    )

    for (const locale of LOCALES) {
      const labels = await entriesOf(locale, 'shared.fields.')
      const orphans = [...labels.keys()].filter((key) => {
        if (MISSING_FROM_SCHEMA.includes(key)) return false

        return !fields.has(key) && !leaves.has(key)
      })

      assert.deepEqual(orphans.sort(), [], locale)
    }
  })
})

/**
 * The phrase of each rule, in the three languages.
 *
 * The backend messages are what the API returns to any client, and it is the
 * unguarded side: a new rule in `#core/validator` with no entry in
 * `validator.json` falls back to VineJS's default and the 422 comes out hybrid - the label in
 * Portuguese inside the English phrase, "The o link field must be a valid URL".
 */

test.group('messages > validation provider', () => {
  test('when a validator uses a rule, has a phrase in the three languages', async ({
    assert,
  }) => {
    // The list is written by hand, and that is what lets a new rule slip through: it is only
    // enforced here after someone adds it. A new rule in
    // `app/core/validator.ts` enters this list in the same commit.
    //
    // `regex` and `confirmed` are left out on purpose: their only uses
    // are in `password()`, and both already have a `field.rule` key. Enforcing
    // the generic one would be enforcing dead code.
    const required = [
      'required',
      'string',
      'enum',
      'email',
      'number',
      'array',
      'object',
      'uuid',
      'url',
      'minLength',
      'maxLength',
      'min',
      'max',
      'positive',
      'withoutDecimals',
      'array.maxLength',
      'password.regex',
      'password.minLength',
      'password.maxLength',
      'passwordConfirmation.confirmed',
      'fileName.regex',
    ]

    for (const locale of LOCALES) {
      const messages = await entriesOf(locale, 'shared.messages.')
      const missing = required.filter((rule) => !messages.has(rule))

      assert.deepEqual(missing, [], locale)
    }
  })

  test('when a pt-BR message is read, none escaped in English', async ({
    assert,
  }) => {
    // `{ field }` is the ICU variable, not displayed text - it leaves before the search,
    // otherwise every message naming the field would be flagged as English. Holds only
    // for pt-BR: in `en` the phrase is English on purpose.
    const suspects = [
      ...(await entriesOf(LOCALE.PT_BR, 'shared.messages.')),
    ].filter(([, message]) =>
      /\b(the|must|field|should|at least|at most|invalid|value)\b/i.test(
        message.replace(/\{.*?\}/g, ''),
      ),
    )

    assert.deepEqual(suspects, [])
  })
})
