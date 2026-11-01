import { Rule, z } from '../../validator.js'

/**
 * The columns that the table shell assembles by itself. They are not content, they are
 * anchors: without the selection checkbox the bulk actions bar becomes unreachable,
 * and without the actions menu the row has no way to be edited or archived.
 */
export const TABLE_ANCHOR_COLUMNS: ReadonlyArray<string> = [
  '_select',
  '_actions',
]

/** The range in which a saved width is still a width. */
export const TABLE_COLUMN_MIN_SIZE = 40
export const TABLE_COLUMN_MAX_SIZE = 640

/**
 * The layout of a panel table - visible columns, order, width,
 * pinning - as the frontend saves it in `localStorage` (`lib/local-store.ts`).
 * It is not a request body: it is the validator of the outside data that the client keeps
 * (`_standards/typescript.md` §2), under `validators/client/` (`architecture.md` §9). Its
 * transforms and catches cannot become a JSON Schema, and it has no field label or OpenAPI,
 * so the label and JSON Schema sweep in `validator.test.ts` skips the `Client*Validator`
 * names by prefix.
 *
 * Each field is tolerant: what lacks the expected shape vanishes, and the rest of the
 * layout holds. An anchor is not left invisible, and a width outside the plausible range
 * is discarded column by column. A value that is not an object fails the schema, and whoever
 * reads falls back to the empty layout.
 */
export const ClientTableLayoutValidator = z.object({
  columnVisibility: Rule.lenientRecord(z.boolean())
    .transform((visibility) =>
      Object.fromEntries(
        Object.entries(visibility).filter(
          ([column]) => !TABLE_ANCHOR_COLUMNS.includes(column),
        ),
      ),
    )
    .optional()
    .catch(undefined),
  columnOrder: z.array(z.string()).optional().catch(undefined),
  columnSizing: Rule.lenientRecord(
    z.number().min(TABLE_COLUMN_MIN_SIZE).max(TABLE_COLUMN_MAX_SIZE),
  )
    .optional()
    .catch(undefined),
  columnPinning: z
    .object({ start: z.array(z.string()), end: z.array(z.string()) })
    .optional()
    .catch(undefined),
})

export type ClientTableLayout = z.infer<typeof ClientTableLayoutValidator>
