import type { SortDirection } from '@aporta/shared'

/**
 * The page the use-case asks the repository for, with defaults already resolved:
 * the piece common to every listing criterion (`_standards/domain.md` §5.1,
 * "a listing filter is a typed criterion"). Each contract extends it with its own
 * filter (`status`, `trashed`, `category`) and closes `Column` with the shared
 * `*_SORT_COLUMNS` tuple.
 */
export type PageCriteria<Column extends string> = {
  readonly page: number
  readonly perPage: number
  readonly search?: string
  readonly sort: Column
  readonly direction: SortDirection
}
