import type { z } from '@aporta/shared'
import type { JSONSchema7 } from 'json-schema'

/**
 * Vocabulary of the documentation generator.
 *
 * It was born before the generator because `defineDocs` is consumed by every controller
 * since the first feature - declaring the contract only once the generator existed
 * would force going back to every controller to add it.
 *
 * The central type is `OperationDocs`: what each controller declares about its
 * own operation. Only what the code does not tell by itself goes in here - route,
 * method, path parameters, security and infrastructure errors are
 * derived from the router in `emit.ts`.
 */

/** A JSON Schema node, as VineJS emits it and as OpenAPI 3.1 consumes it. */
export type SchemaObject = JSONSchema7

/**
 * A VineJS validator, seen only for what the generator needs from it.
 *
 * Structural instead of `VineValidator<any, any>`: the generator keeps validators
 * of different shapes in the same list, and the generic would only serve to be
 * erased with `any`. Declaring the two methods used says more and does not lie.
 *
 * `toJSONSchema()` delivers the publishable schema. `toJSON()` delivers the internal
 * tree, which is the only place where a field's subtype survives - it is from it
 * that `schema.ts` finds out an empty `{}` was a `vine.date()`.
 */
export type DocumentedValidator = {
  toJSONSchema(): SchemaObject
  toJSON(): { schema: unknown }
}

/**
 * A response schema: a `<Module><Resource><Action>Response` from
 * `@aporta/shared` (`_standards/architecture.md` §10). The generator converts it
 * via `z.toJSONSchema` (`zod-schema.ts`); the registry in `response.ts` says which one
 * answers for each action.
 */
export type ResponseSchema = z.ZodType

/**
 * What an operation may return at a given status, when the registry is
 * not enough: the download redirect has no body at all.
 */
export type ResponseBody = ResponseSchema | 'no-content'

/**
 * The public contract of an operation, declared as `static docs` on the
 * controller.
 *
 * Every field is optional, and most controllers only use `summary` and
 * `description`: the generator derives route, method, payload, response, status and the
 * infrastructure errors from the code itself (`introspect.ts`). This block
 * exists for what the code does not tell - the prose that explains the business rule
 * - and to fix a wrong derivation.
 *
 * `errors` maps status to the `code`(s) that operation may return
 * at that status, and is what makes the failure list exhaustive for whoever generates
 * a client from the document. The automatic ones - 401 with `auth`, 403 with
 * `role`, 422 with any validator, 500 always - need not be declared.
 *
 * `overrides` is the escape hatch for what VineJS cannot express. It is merged last,
 * over the derived schema.
 */
export type OperationDocs = {
  summary?: string
  description?: string
  /** Overrides the tag derived from the path. Rare. */
  tag?: string
  body?: DocumentedValidator
  query?: DocumentedValidator
  params?: DocumentedValidator
  /**
   * The response per status, when the `response.ts` registry does not say it. Rare:
   * only the bodyless download redirect.
   */
  responses?: Record<number, ResponseBody>
  errors?: Record<number, string | string[]>
  overrides?: {
    body?: SchemaObject
    responses?: Record<number, SchemaObject>
  }
  deprecated?: boolean
}

/**
 * Typed identity. It exists to give inference and autocomplete on the declaration
 * inside the controller, at no runtime cost.
 */
export function defineDocs(docs: OperationDocs): OperationDocs {
  return docs
}

/** A controller as seen by the generator: it may or may not have declared its documentation. */
export type DocumentedController = {
  docs?: OperationDocs
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export type OpenAPIOperation = {
  operationId: string
  summary: string
  description?: string
  tags: string[]
  deprecated?: boolean
  security?: Array<Record<string, string[]>>
  /** The roles the middleware chain requires. Read by `authz:check`. */
  'x-roles'?: string[]
  parameters?: Array<OpenAPIParameter | OpenAPIParameterRef>
  requestBody?: {
    required: boolean
    content: Record<string, { schema: SchemaObject }>
  }
  responses: Record<string, OpenAPIResponse>
}

export type OpenAPIParameter = {
  name: string
  in: 'path' | 'query' | 'header'
  required: boolean
  description?: string
  schema: SchemaObject
}

/** Common parameter, declared once in `components.parameters`. */
export type OpenAPIParameterRef = { $ref: string }

export type OpenAPIResponse = {
  description: string
  content?: Record<string, { schema: SchemaObject }>
}

export type OpenAPIDocument = {
  openapi: string
  info: Record<string, unknown>
  servers: Array<Record<string, unknown>>
  tags: Array<{ name: string; description: string }>
  paths: Record<string, Record<string, OpenAPIOperation>>
  components: {
    securitySchemes: Record<string, Record<string, string>>
    parameters: Record<string, OpenAPIParameter>
    schemas: Record<string, SchemaObject>
  }
}
