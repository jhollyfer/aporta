import { describe, expect, it } from 'vitest'

import * as shared from '../index.js'
import { z } from '../validator.js'
import { ErrorEnvelope, PaginationMeta, ResponseRule } from './envelope.js'

const META = {
  total: 1,
  perPage: 20,
  currentPage: 1,
  lastPage: 1,
  firstPage: 1,
  firstPageUrl: '/?page=1',
  lastPageUrl: '/?page=1',
  nextPageUrl: null,
  previousPageUrl: null,
}

describe('ErrorEnvelope', () => {
  it('when given the error body with and without `errors`, it accepts it', () => {
    const body = { message: 'Falhou', status: 422, code: 'VALIDATION_ERROR' }

    expect(ErrorEnvelope.safeParse(body).success).toBe(true)
    expect(
      ErrorEnvelope.safeParse({
        ...body,
        errors: { title: 'Informe o título' },
      }).success,
    ).toBe(true)
  })

  it('when `errors` is a list, it refuses it, since the screen would print it as `[object Object]`', () => {
    const body = { message: 'x', status: 422, code: 'X', errors: { a: ['b'] } }

    expect(ErrorEnvelope.safeParse(body).success).toBe(false)
  })
})

describe('ResponseRule.paginated', () => {
  const page = ResponseRule.paginated(z.object({ id: z.string() }))

  it('when given `{ meta, data }` with nullable addresses, it accepts it', () => {
    expect(page.safeParse({ meta: META, data: [{ id: 'a' }] }).success).toBe(
      true,
    )
  })

  it('when the page has no `meta`, it refuses it', () => {
    expect(page.safeParse({ data: [] }).success).toBe(false)
  })

  it('when generating the JSON Schema, it references `PaginationMeta` by id', () => {
    const schema = z.toJSONSchema(page, { io: 'output' })

    expect(schema.properties?.meta).toEqual({
      $ref: '#/$defs/PaginationMeta',
    })
    expect(PaginationMeta.safeParse(META).success).toBe(true)
  })
})

describe('ResponseRule.datetime', () => {
  it('when given Luxon ISO in UTC and with an offset, it accepts both', () => {
    const datetime = ResponseRule.datetime()

    expect(datetime.safeParse('2026-10-29T12:00:00.000Z').success).toBe(true)
    expect(datetime.safeParse('2026-10-29T09:00:00.000-03:00').success).toBe(
      true,
    )
    expect(datetime.safeParse('29/10/2026').success).toBe(false)
  })
})

describe('response schemas', () => {
  const responses = Object.entries(shared).flatMap(([name, value]) => {
    if (!name.endsWith('Response') || !(value instanceof z.ZodType)) return []
    return [[name, value] as const]
  })

  it('when covering operations, it includes those that return a body', () => {
    expect(responses.length).toBeGreaterThan(5)
  })

  // The OpenAPI generator converts each one through `z.toJSONSchema`; a type without a
  // representation (`z.date()`, `transform`) makes Zod throw
  // (_doc-lib/zod.md#json-schema). Catching it here is catching it before the backend.
  it.each(responses)(
    'when the response is %s, it converts to JSON Schema',
    (_name, schema) => {
      expect(() => z.toJSONSchema(schema, { io: 'output' })).not.toThrow()
    },
  )
})
