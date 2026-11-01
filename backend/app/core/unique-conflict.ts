/**
 * The persistence fact "the `UNIQUE` index blocked it": another write took the
 * `slug` or the email between the use-case lookup and the `INSERT`. Each aggregate
 * has a single unique column, so the use-case knows which one it was. It is the contract's
 * result, and not an error (`_standards/domain.md` §6: the unique index violation
 * becomes the already existing result).
 */
export type UniqueConflict = { readonly code: 'UNIQUE_CONFLICT' }

export const UNIQUE_CONFLICT: UniqueConflict = { code: 'UNIQUE_CONFLICT' }
