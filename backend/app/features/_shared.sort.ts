import { SORT_DIRECTION, type SortDirection } from '@aporta/shared'

/**
 * The order of a chronological listing: `createdAt` **descending**, unlike
 * all the others. Spread like its sibling -
 * `query.orderBy(...recentFirst(payload))`.
 *
 * It exists because `sortOrder()` assumes `asc`, and in a listings catalog what
 * matters is the latest publication, not the first: with `title` as fallback, a
 * new listing landed in the middle of the alphabetical list, and with `createdAt asc` it
 * would land at the end.
 *
 * A function with its own name, and not a direction parameter on `sortOrder()`: the
 * exception stays visible at the call, instead of hidden behind an argument
 * nobody reads when skimming the query.
 */
export function recentFirst<TColumn extends string>(payload: {
  sort?: TColumn
  direction?: SortDirection
}): [TColumn | 'createdAt', SortDirection] {
  return [payload.sort ?? 'createdAt', payload.direction ?? SORT_DIRECTION.DESC]
}

/**
 * The order of a listing that sorts by a column of its own, **ascending** unless the client
 * asks otherwise. Spread like its sibling: `query.orderBy(...sortOrder(payload, 'name'))`.
 *
 * `fallback` is a parameter and not a guess: each resource knows which column its listing is read
 * by (`name` for a list of places), and the one `recentFirst` is the exception that has its own
 * name for the opposite direction.
 */
export function sortOrder<TColumn extends string>(
  payload: { sort?: TColumn; direction?: SortDirection },
  fallback: TColumn,
): [TColumn, SortDirection] {
  return [payload.sort ?? fallback, payload.direction ?? SORT_DIRECTION.ASC]
}
