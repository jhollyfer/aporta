import { z } from '../validator.js'

/**
 * The envelope of every API response and the shape pieces that more than one
 * response uses (`_standards/architecture.md` §10).
 *
 * The response schemas are the source of the contract on both sides: the frontend
 * converts the `unknown` body through them at a single point
 * (`integrations/tanstack-query/http.ts`), and the backend's OpenAPI generator
 * converts them to JSON Schema through `z.toJSONSchema(schema, { io: 'output' })`
 * (_doc-lib/zod.md#json-schema, https://zod.dev/json-schema). That is why only
 * transport types, which have a JSON Schema representation, go in here: a date is
 * ISO 8601 text, never `z.date()`.
 */

/**
 * The body of every error response: `code` is the stable identifier that the
 * client compares; `message` is interface text in the requested language and is never
 * compared; `errors` is `field → message` (the first of each field), with the
 * `root` key for the whole form.
 */
export const ErrorEnvelope = z.object({
  message: z.string(),
  status: z.int(),
  code: z.string(),
  errors: z.record(z.string(), z.string()).optional(),
})

export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>

/**
 * The page metadata, as Lucid's paginator returns it. The two middle
 * addresses are nullable: on the first page there is no previous, on the
 * last there is no next.
 *
 * The `id` is the component name in the OpenAPI: the backend generator extracts it
 * once and every listing references it, instead of repeating it in each operation
 * (_doc-lib/zod.md#json-schema, `metadata` option).
 */
export const PaginationMeta = z
  .object({
    total: z.int(),
    perPage: z.int(),
    currentPage: z.int(),
    lastPage: z.int(),
    firstPage: z.int(),
    firstPageUrl: z.string(),
    lastPageUrl: z.string(),
    nextPageUrl: z.string().nullable(),
    previousPageUrl: z.string().nullable(),
  })
  .meta({
    id: 'PaginationMeta',
    description: 'Metadados da página, como o paginator do Lucid os devolve.',
  })

export type PaginationMeta = z.infer<typeof PaginationMeta>

/** The paginated response as it goes on the wire: `{ meta, data }`. */
export type Paginated<TItem> = {
  meta: PaginationMeta
  data: TItem[]
}

/**
 * The shape rules that more than one response uses (`_standards/typescript.md`
 * §6), in the same design as the validators' `Rule`.
 */
export class ResponseRule {
  /**
   * The paginated envelope around the item. The inferred type is the same
   * `Paginated<T>` above, and `PaginationMeta` comes out referenced in the OpenAPI.
   */
  static paginated<TItem extends z.ZodType>(
    item: TItem,
  ): z.ZodObject<{ meta: typeof PaginationMeta; data: z.ZodArray<TItem> }> {
    return z.object({ meta: PaginationMeta, data: z.array(item) })
  }

  /**
   * An instant, as Luxon's `DateTime` serializes it (`toISO()`): ISO 8601
   * with the offset, `Z` or `±hh:mm`. `offset: true` accepts both.
   */
  static datetime(): z.ZodISODateTime {
    return z.iso.datetime({ offset: true })
  }

  /**
   * The three dates of every panel row. `updatedAt` and `deletedAt` are
   * nullable: a row that was never edited has no first one, and one that is
   * not in the trash has no second one.
   */
  static timestamps(): {
    createdAt: z.ZodISODateTime
    updatedAt: z.ZodNullable<z.ZodISODateTime>
    deletedAt: z.ZodNullable<z.ZodISODateTime>
  } {
    return {
      createdAt: ResponseRule.datetime(),
      updatedAt: ResponseRule.datetime().nullable(),
      deletedAt: ResponseRule.datetime().nullable(),
    }
  }
}
