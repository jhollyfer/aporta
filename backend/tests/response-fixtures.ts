import type { Either } from '@aporta/shared'
import type { ApiResponse } from '@japa/api-client'

import type { ErrorEnvelope } from '#core/response'

/**
 * Reading the response body in the specs.
 *
 * The client registry matches the route by path and not by method, so
 * `response.body()` comes as the union of all responses of that path -
 * error ones included. Instead of `any`, the body enters as `unknown` and each
 * read narrows what it needs (`typescript.md` §2): an object, a list, the
 * page or the error envelope. What does not have the requested shape fails the test
 * saying what was missing, instead of becoming `undefined` three lines later.
 */

/** A JSON object: the keys exist, the type of each value has not yet been proven. */
export type JsonObject = { readonly [key: string]: unknown }

/** A listing page: `meta` and the list of items. */
export type JsonPage = {
  readonly meta: JsonObject
  readonly data: ReadonlyArray<JsonObject>
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** The value as a JSON object, or the test fails. */
export function object(value: unknown): JsonObject {
  if (!isObject(value))
    throw new Error(`expected a JSON object, got ${JSON.stringify(value)}`)
  return value
}

/** The value as a list of JSON objects, or the test fails. */
export function list(value: unknown): ReadonlyArray<JsonObject> {
  if (!Array.isArray(value))
    throw new Error(`expected a list, got ${JSON.stringify(value)}`)

  const items: ReadonlyArray<unknown> = value
  return items.map((item) => object(item))
}

/** The response body as a JSON object. */
export function body(response: ApiResponse): JsonObject {
  const raw: unknown = response.body()
  return object(raw)
}

/** The `id` of the created resource, as text (the test fails if the body carries none). */
export function idOf(response: ApiResponse): string {
  const { id } = body(response)
  if (typeof id !== 'string')
    throw new Error(`expected the id in the body, got ${JSON.stringify(id)}`)
  return id
}

/** The body of a paginated listing. */
export function page(response: ApiResponse): JsonPage {
  const raw = body(response)
  return { meta: object(raw.meta), data: list(raw.data) }
}

/** The error envelope (`{ message, status, code, errors? }`). */
export function errorBody(response: ApiResponse): ErrorEnvelope {
  const raw = body(response)
  const { message, status, code, errors } = raw

  if (
    typeof message !== 'string' ||
    typeof status !== 'number' ||
    typeof code !== 'string'
  )
    throw new Error(`expected the error envelope, got ${JSON.stringify(raw)}`)

  if (errors === undefined) return { message, status, code }

  const fields = object(errors)
  const messages: Record<string, string> = {}

  for (const [field, text] of Object.entries(fields)) {
    if (typeof text !== 'string')
      throw new Error(`field error without text in ${field}`)
    messages[field] = text
  }

  return { message, status, code, errors: messages }
}

/**
 * The value, or fails the test with what was missing.
 *
 * For `noUncheckedIndexedAccess`: `list[0]` types as `T | undefined`, and a
 * `!` would hide exactly the failure the test exists to show.
 */
export function present<T>(value: T | null | undefined, what: string): T {
  if (value === undefined || value === null)
    throw new Error(`expected ${what}, none came`)
  return value
}

/**
 * The `right` of an `Either` that the test expects to be a success; the `left` fails the test
 * with the `code` the service answered.
 */
export function rightOf<L extends { readonly code: string }, R>(
  result: Either<L, R>,
): R {
  if (result.isLeft())
    throw new Error(`expected a right, got ${result.value.code}`)
  return result.value
}
