/**
 * The direction of a listing's sorting. Absent is `asc`, which is the order the
 * listings already had before they accepted the parameter.
 */
export const SORT_DIRECTION = {
  ASC: 'asc',
  DESC: 'desc',
} as const

export type SortDirection = (typeof SORT_DIRECTION)[keyof typeof SORT_DIRECTION]

export const SORT_DIRECTIONS = Object.values(SORT_DIRECTION)
