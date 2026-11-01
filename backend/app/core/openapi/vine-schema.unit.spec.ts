import { test } from '@japa/runner'

import type { SchemaObject } from '#core/openapi/types'
import { VineSchemaConverter } from '#core/openapi/vine-schema'
import { DatedValidator } from '#tests/openapi-fixtures'

/**
 * The gaps of `validator.toJSONSchema()` that the converter plugs: a `vine.date()` comes out as
 * an empty `{}`, which would document the field as "anything". The validator with a date is a
 * fixture (`tests/openapi-fixtures.ts`): no resource validator carries one yet.
 */

test.group('core > openapi > vine schema converter (unit)', () => {
  test('when a validator with a date is converted, the date becomes a date-time string with no warning', ({
    assert,
  }) => {
    const warnings: string[] = []

    const schema = VineSchemaConverter.toSchema(DatedValidator, 'op', warnings)

    assert.deepEqual(schema.properties?.day, {
      type: 'string',
      format: 'date-time',
    })
    assert.deepEqual(warnings, [])
  })

  test('when a schema is split into parameters, a path one is always required and a query one follows the schema', ({
    assert,
  }) => {
    const schema: SchemaObject = {
      type: 'object',
      properties: { id: { type: 'string' }, page: { type: 'number' } },
      required: ['id'],
    }

    const path = VineSchemaConverter.toParameters(schema, 'path')
    const query = VineSchemaConverter.toParameters(schema, 'query')

    assert.isTrue(path.every((parameter) => parameter.required))
    assert.deepEqual(
      query.map((parameter) => [parameter.name, parameter.required]),
      [
        ['id', true],
        ['page', false],
      ],
    )
  })

  test('when an override is merged, properties merge key by key and required takes the union', ({
    assert,
  }) => {
    const merged = VineSchemaConverter.mergeSchema(
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        required: ['a'],
      },
      { properties: { b: { type: 'string' } }, required: ['b'] },
    )

    assert.deepEqual(Object.keys(merged.properties ?? {}), ['a', 'b'])
    assert.deepEqual(merged.required, ['a', 'b'])
  })
})
