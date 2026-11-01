import { isDeepStrictEqual } from 'node:util'

import {
  SORT_DIRECTION,
  TRASHED_MODE,
  type Paginated,
  type PaginationMeta,
  type TrashedMode,
} from '@aporta/shared'

import type { PageCriteria } from '#core/page-criteria'

/** What the ordering compares: text, number or instant. */
export type SortValue = string | number | Date | null

/** The minimum of every stored row: the key and the trash. */
type Trashable = { readonly id: string; deletedAt: Date | null }

/** The "row": the entity state and the stamps persistence adds. */
// & keeps `Props` open: Merge over a type parameter stays deferred and rejects the stamps
export type StoredRow<Props extends Trashable> = Props & {
  createdAt: Date
  updatedAt: Date | null
}

/**
 * What every in-memory implementation imitates from Lucid the same way: the
 * time stamps, the trash cut, the search `ILIKE` and the
 * `SimplePaginator` meta (`_standards/domain.md` §5.3).
 *
 * It lives here for the same reason as `lucid-mapping.ts`: a copy per resource
 * would be where an in-memory implementation stops imitating Lucid and the
 * contract test only catches it in one of them (`docs/DECISIONS.md` #22). A class with only
 * `static`: the state (the `Map`) belongs to each repository.
 */
export default class MemoryRows {
  /**
   * The row that `save` writes: creation stamp on insert, `updatedAt` only
   * when some column changed, which is when Lucid touches `updated_at`.
   * `outsideRow` are the props that live outside the row (the gallery, in a pivot):
   * changing only them does not touch `updated_at`, as in Lucid.
   */
  static stamp<Props extends Trashable>(
    snapshot: Props,
    stored: StoredRow<Props> | undefined,
    now: Date,
    outsideRow: ReadonlyArray<keyof Props> = [],
  ): StoredRow<Props> {
    const next = structuredClone(snapshot)
    if (!stored) return { ...next, createdAt: now, updatedAt: now }

    const { createdAt, updatedAt, ...previous } = stored
    const changed = Object.keys(next).some(
      (key) =>
        !outsideRow.some((outside) => outside === key) &&
        !isDeepStrictEqual(Reflect.get(previous, key), Reflect.get(next, key)),
    )
    let touched = updatedAt
    if (changed) touched = now

    return { ...next, createdAt, updatedAt: touched }
  }

  /** The trash side the mode asks for, like the model's `trashed` scope. */
  static inTrash(row: Trashable, trashed?: TrashedMode): boolean {
    if (trashed === TRASHED_MODE.WITH) return true
    if (trashed === TRASHED_MODE.ONLY) return row.deletedAt !== null
    return row.deletedAt === null
  }

  /** Postgres `ILIKE '%term%'` on any of the columns: contains, case-insensitive. */
  static contains(
    values: ReadonlyArray<string>,
    search: string | undefined,
  ): boolean {
    if (!search) return true
    const term = search.toLowerCase()
    return values.some((value) => value.toLowerCase().includes(term))
  }

  /** Orders by the criterion's column, cuts the page and builds Lucid's meta. */
  static page<Row, Item>(
    rows: ReadonlyArray<Row>,
    criteria: PageCriteria<string>,
    read: {
      readonly sortValue: (row: Row) => SortValue
      readonly toItem: (row: Row) => Item
    },
  ): Paginated<Item> {
    let direction = 1
    if (criteria.direction === SORT_DIRECTION.DESC) direction = -1

    const sorted = rows.toSorted(
      (left, right) =>
        direction *
        MemoryRows.compare(read.sortValue(left), read.sortValue(right)),
    )
    const start = (criteria.page - 1) * criteria.perPage

    return {
      meta: MemoryRows.meta(rows.length, criteria.page, criteria.perPage),
      data: sorted
        .slice(start, start + criteria.perPage)
        .map((row) => read.toItem(row)),
    }
  }

  private static compare(left: SortValue, right: SortValue): number {
    if (left instanceof Date && right instanceof Date)
      return left.getTime() - right.getTime()
    if (typeof left === 'number' && typeof right === 'number')
      return left - right
    return String(left).localeCompare(String(right))
  }

  /** The same meta as Lucid's `SimplePaginator`, with the default base URL `/`. */
  private static meta(
    total: number,
    page: number,
    perPage: number,
  ): PaginationMeta {
    const lastPage = Math.max(Math.ceil(total / perPage), 1)
    let nextPageUrl: string | null = null
    let previousPageUrl: string | null = null
    if (lastPage > page) nextPageUrl = `/?page=${page + 1}`
    if (page > 1) previousPageUrl = `/?page=${page - 1}`

    return {
      total,
      perPage,
      currentPage: page,
      lastPage,
      firstPage: 1,
      firstPageUrl: '/?page=1',
      lastPageUrl: `/?page=${lastPage}`,
      nextPageUrl,
      previousPageUrl,
    }
  }
}
