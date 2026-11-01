import { z } from '@aporta/shared'

import type { ResponseSchema, SchemaObject } from '#core/openapi/types'

/** A response schema already as JSON Schema, with the components it cites. */
export type ConvertedResponse = {
  schema: SchemaObject
  components: Record<string, SchemaObject>
}

/**
 * Zod response schema (`@aporta/shared`) -> publishable JSON Schema.
 *
 * No AST and no model: `z.toJSONSchema(schema, { io: 'output' })` does the
 * conversion, and Zod refuses a type with no representation instead of staying silent
 * (_doc-lib/zod.md#json-schema, https://zod.dev/json-schema;
 * `_standards/openapi.md#schema-de-resposta`).
 *
 * A schema with an `id` in its metadata (`PaginationMeta`) comes out in `$defs` and is cited
 * by `$ref`. Here `$defs` becomes a document component and the reference
 * now points to `#/components/schemas/`: this is what lets every listing cite a single
 * `PaginationMeta` instead of repeating it. The top-level `$schema` is dropped because
 * OpenAPI 3.1 already states the dialect of the whole document.
 */
export class ZodSchemaConverter {
  static readonly #DEFS = '"#/$defs/'
  static readonly #COMPONENTS = '"#/components/schemas/'

  static convert(response: ResponseSchema): ConvertedResponse {
    // The round trip through text swaps the prefix of every reference at once, at
    // any depth, without walking the tree by hand.
    const json: unknown = JSON.parse(
      JSON.stringify(z.toJSONSchema(response, { io: 'output' })).replaceAll(
        ZodSchemaConverter.#DEFS,
        ZodSchemaConverter.#COMPONENTS,
      ),
    )

    if (!ZodSchemaConverter.#isSchema(json))
      return { schema: {}, components: {} }

    const { $defs, ...schema } = json
    // OpenAPI 3.1 already states the dialect of the whole document.
    Reflect.deleteProperty(schema, '$schema')
    const components: Record<string, SchemaObject> = {}

    for (const [name, definition] of Object.entries($defs ?? {})) {
      if (ZodSchemaConverter.#isSchema(definition))
        components[name] = definition
    }

    return { schema, components }
  }

  /** The boundary: the JSON Zod emitted, read as a JSON Schema node. */
  static #isSchema(value: unknown): value is SchemaObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }
}
