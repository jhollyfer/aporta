import { afterEach, describe, expect, it, test } from 'vitest'

import * as shared from './index.js'
import { ValidationFixture } from './validation-fixtures.js'
import {
  FIELD_LABELS,
  RULE_MESSAGES,
  Rule,
  ValidationMessage,
  z,
} from './validator.js'

/**
 * The tests of the whole validation standard: a label for every field, a ceiling for
 * every text, a message in the three languages and the backend's blank field
 * semantics. The list of validators comes from `index.ts` itself, and not from a
 * second list to keep up to date: a new validator enters the sweep on its own.
 */

/** Any node of the JSON Schema, proven while descending instead of asserted. */
class SchemaWalker {
  static branch(node: unknown, key: string): Array<unknown> {
    if (typeof node !== 'object' || node === null) return []
    if (!(key in node)) return []

    const value: unknown = Reflect.get(node, key)
    if (Array.isArray(value)) return value

    return [value]
  }

  /** Every field path of the schema, with the node along with it (`parts[].etag`). */
  static fields(schema: unknown, prefix = ''): Array<[string, unknown]> {
    const found: Array<[string, unknown]> = []

    for (const each of SchemaWalker.branch(schema, 'anyOf'))
      found.push(...SchemaWalker.fields(each, prefix))
    for (const each of SchemaWalker.branch(schema, 'items'))
      found.push(...SchemaWalker.fields(each, `${prefix}[]`))

    for (const properties of SchemaWalker.branch(schema, 'properties')) {
      if (typeof properties !== 'object' || properties === null) continue

      for (const [name, child] of Object.entries(properties)) {
        let path = name
        if (prefix) path = `${prefix}.${name}`

        found.push([path, child])
        found.push(...SchemaWalker.fields(child, path))
      }
    }

    return found
  }

  static leaf(path: string): string {
    return path.slice(path.lastIndexOf('.') + 1).replace('[]', '')
  }
}

// Only the input ones (`*Validator`). `io: 'output'` reads the schema after the
// blank-field preprocessing, which is what has type and ceiling. `Client*Validator` is the
// validator of data the client keeps (`localStorage`), not an endpoint: it has no label and
// its transforms are not representable in JSON Schema.
const validators = Object.entries(shared)
  .filter(([name]) => name.endsWith('Validator') && !name.startsWith('Client'))
  .map(([, value]) => value)
  .filter((value) => value instanceof z.ZodType)
  .map((value) => z.toJSONSchema(value, { io: 'output' }))

const fields = validators.flatMap((schema) => SchemaWalker.fields(schema))
const leaves = new Set(fields.map(([path]) => SchemaWalker.leaf(path)))

/**
 * A legitimate label that this walker never reaches. `type` is the rich text document's `type`:
 * the VineJS pair declares it as a field (`content.type`) and so the backend names it, while the
 * Zod schema keeps the document behind a `$ref` (`RichTextDocument`) that this walker does not follow.
 */
const BEHIND_A_REF = ['type']

describe('labels', () => {
  test('when sweeping, it reaches every exported validator', () => {
    // A filter that matches nothing does not fail: the tests below would pass by
    // vacuity. Three global ones, plus those of each resource.
    expect(validators.length).toBe(14)
  })

  test('when checking fields, every validator field has a label', () => {
    const withoutLabel = [...leaves]
      .filter((leaf) => !(leaf in FIELD_LABELS['pt-BR']))
      .sort()

    expect(withoutLabel).toEqual([])
  })

  test('when checking labels, no label is left for a field that no longer exists', () => {
    const orphans = Object.keys(FIELD_LABELS['pt-BR'])
      .filter((key) => !leaves.has(key) && !BEHIND_A_REF.includes(key))
      .sort()

    expect(orphans).toEqual([])
  })
})

describe('messages', () => {
  afterEach(() => ValidationMessage.setLocale('pt-BR'))

  test('when scanning messages, no pt-BR message escaped in English', () => {
    // `{{ field }}` is a placeholder, and not displayed text: it comes out before the search.
    const suspects = Object.values(RULE_MESSAGES['pt-BR']).filter((message) =>
      /\b(the|must|field|should|at least|at most|enter)\b/i.test(
        message.replace(/\{\{.*?\}\}/g, ''),
      ),
    )

    expect(suspects).toEqual([])
  })

  it('when answering, it speaks Portuguese, with the field label', () => {
    const result = shared.AuthenticationSessionSignInValidator.safeParse({})

    expect(ValidationFixture.messages(result)).toEqual([
      { field: 'email', message: 'Informe o e-mail' },
      { field: 'password', message: 'Informe a senha' },
    ])
  })

  it('when switching language, it changes the messages and the labels', () => {
    ValidationMessage.setLocale('es')
    const es = ValidationFixture.messages(
      shared.AuthenticationSessionSignInValidator.safeParse({}),
    )

    ValidationMessage.setLocale('en')
    const en = ValidationFixture.messages(
      shared.AuthenticationSessionSignInValidator.safeParse({
        email: 'x',
        password: 'p',
      }),
    )

    expect(es).toEqual([
      { field: 'email', message: 'Ingrese el correo electrónico' },
      { field: 'password', message: 'Ingrese la contraseña' },
    ])
    expect(en).toEqual([{ field: 'email', message: 'Enter a valid email' }])
  })

  it('when the house does not cover it, it yields to the Zod locale', () => {
    const result = z.strictObject({}).safeParse({ extra: 1 })

    expect(result.error?.issues[0]?.message).toMatch(/extra/)
  })
})

describe('ceilings', () => {
  test('when checking text fields, every one has a size limit', () => {
    // The text columns are `varchar(255)`: without a ceiling, a large value gets through
    // validation and blows up in Postgres as a 500. `format`, `pattern` and
    // `enum` limit by another path.
    const withoutCeiling = fields
      .filter(([, node]) =>
        SchemaWalker.branch(node, 'type').includes('string'),
      )
      .filter(([, node]) =>
        ['maxLength', 'format', 'pattern', 'enum'].every(
          (key) => SchemaWalker.branch(node, key).length === 0,
        ),
      )
      .map(([path]) => path)

    expect([...new Set(withoutCeiling)].sort()).toEqual([])
  })
})

describe('blank field', () => {
  /**
   * The mirror of the backend bodyparser's `convertEmptyStringsToNull: true`: the
   * `''` of an empty `<input>` is absent in the optional field, `null` in the nullable
   * and "required" in the required one. Without this the client would refuse what the API
   * accepts, and approve what it denies.
   */
  const schema = z.object({
    note: Rule.optional(Rule.email()),
    avatarId: Rule.nullable(z.uuid()),
    name: z.string().trim().min(1).max(10),
  })

  it('when given a blank field, it delivers absent for optional and null for nullable', () => {
    const result = schema.safeParse({ note: '', avatarId: '', name: 'x' })

    expect(result.data).toEqual({ note: undefined, avatarId: null, name: 'x' })
  })

  it('when the optional field is missing, it accepts it', () => {
    expect(schema.safeParse({ name: 'x' }).success).toBe(true)
  })

  it('when the required field is blank, it demands it as absent', () => {
    const result = schema.safeParse({ name: '   ' })

    expect(ValidationFixture.messages(result)).toEqual([
      { field: 'name', message: 'Informe o nome' },
    ])
  })
})

describe('global validators', () => {
  it('when the identifier is not a uuid, it refuses it', () => {
    const result = shared.IdentifierValidator.safeParse({ id: '42' })

    expect(ValidationFixture.fields(result)).toEqual(['id'])
  })

  it('when given pagination with trash, it accepts it and refuses an uppercase slice', () => {
    const accepted = shared.TrashablePaginationValidator.safeParse({
      page: 1,
      trashed: 'only',
    })
    const rejected = shared.TrashablePaginationValidator.safeParse({
      trashed: 'ONLY',
    })

    expect(accepted.success).toBe(true)
    expect(ValidationFixture.fields(rejected)).toEqual(['trashed'])
  })

  it('when given public pagination, it does not accept trash', () => {
    const result = shared.PaginationValidator.safeParse({
      search: '',
      trashed: 'only',
    })

    expect(result.data).toEqual({ search: undefined })
  })
})
