import { RichTextDocumentSchema, type RichTextDocument } from '@aporta/shared'

/**
 * Lucid column options that more than one model uses (`prepare`/`consume`,
 * `backend.md` §4.7). Each model applies them with `@column(<OPTION>)`: the conversion
 * lives in one place, and per-model copies diverged on the first fix.
 */

/**
 * List of strings in a `jsonb` column.
 *
 * `prepare` exists because the Postgres driver receives the raw JavaScript array
 * and answers `invalid input syntax for type json`. `consume`, because the driver
 * returns `jsonb` already deserialized on some paths and as text on
 * others - and what comes from the database is external data: it enters as `unknown` and leaves
 * as `Array<string>` only after being checked (`typescript.md` §2). A row written
 * outside the application with another shape becomes an error on read, not `undefined` on
 * screen.
 */
export const STRING_LIST_COLUMN = {
  prepare(value: ReadonlyArray<string> | null): string {
    return JSON.stringify(value ?? [])
  },

  consume(value: unknown): Array<string> | null {
    let parsed: unknown = value
    if (typeof value === 'string') parsed = JSON.parse(value)

    if (parsed === null || parsed === undefined) return null
    if (!Array.isArray(parsed))
      throw new TypeError('list column: the database returned no array')

    const items: ReadonlyArray<unknown> = parsed
    const list: Array<string> = []

    for (const item of items) {
      if (typeof item !== 'string')
        throw new TypeError('list column: item is not text')
      list.push(item)
    }

    return list
  },
} as const

/**
 * The editor's JSON document in a `jsonb` column (`RichTextDocument`).
 *
 * `prepare` serializes because the Postgres driver would receive a JavaScript object and send
 * it as text of the wrong shape. `consume` reads what comes from the database as external data
 * - it enters as `unknown` and leaves as `RichTextDocument` only after the Zod schema accepts
 * it, so a row written outside the application with another shape fails on read instead of
 * reaching the renderer.
 */
export const RICH_TEXT_COLUMN = {
  prepare(value: RichTextDocument): string {
    return JSON.stringify(value)
  },

  consume(value: unknown): RichTextDocument {
    let parsed: unknown = value
    if (typeof value === 'string') parsed = JSON.parse(value)

    return RichTextDocumentSchema.parse(parsed)
  },
} as const
