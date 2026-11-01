import {
  left,
  right,
  type Either,
  type Paginated,
  type PaginationMeta,
  type SortDirection,
  type StorageFileShowResponse,
} from '@aporta/shared'
import { DateTime } from 'luxon'

import type { PageCriteria } from '#core/page-criteria'
import RepositoryFailure from '#core/repository-failure'
import { UNIQUE_CONFLICT, type UniqueConflict } from '#core/unique-conflict'
import type Storage from '#models/storage'

/**
 * What `page` uses of the model query: ordering and paginating. Structural because
 * Lucid's `paginate` response is a conditional type over the row, which does not
 * resolve in a generic.
 */
type PageableQuery<Row> = {
  orderBy(
    column: string,
    direction: SortDirection,
  ): {
    paginate(
      page: number,
      perPage: number,
    ): Promise<{ getMeta(): PaginationMeta; all(): Row[] }>
  }
}

/** What `count` uses of the model query: the aliased `count`. */
type CountableQuery = {
  count(
    column: string,
  ): Promise<ReadonlyArray<{ $extras: Record<string, unknown> }>>
}

/**
 * What every Lucid repository implementation converts the same way: the
 * preloaded `storages` file (avatar, cover, gallery), the time
 * columns and the paginator page.
 *
 * It lives here, and not as a private method of each `*.lucid.repository.ts`
 * (`_standards/domain.md` §5.2), because the shape is the same in all: the `storages`
 * mapper would be copied into each resource with a file. What belongs to each entity
 * (`toEntity`, `toRow`) stays private in its implementation.
 *
 * A class with only `static`, like `WireDate` in `core/response.ts`: it keeps no
 * state and talks to nothing outside, so there is nothing to inject.
 */
export default class LucidMapping {
  /** The `storages` row with the keys the panel reads, by allowlist. */
  static file(storage: Storage | null): StorageFileShowResponse | null {
    if (!storage) return null

    return {
      id: storage.id,
      filename: storage.filename,
      originalName: storage.originalName,
      mimetype: storage.mimetype,
      size: storage.size,
      path: storage.path,
      status: storage.status,
      partSize: storage.partSize,
      uploadId: storage.uploadId,
      createdAt: LucidMapping.iso(storage.createdAt),
      updatedAt: LucidMapping.iso(storage.updatedAt),
      deletedAt: LucidMapping.iso(storage.deletedAt),
    }
  }

  /** A gallery (`manyToMany`), in the order Lucid returned it. */
  static files(storages: ReadonlyArray<Storage>): StorageFileShowResponse[] {
    const files: StorageFileShowResponse[] = []

    for (const storage of storages) {
      const file = LucidMapping.file(storage)
      if (file) files.push(file)
    }

    return files
  }

  static date(value: DateTime | null): Date | null {
    if (!value) return null
    return value.toJSDate()
  }

  static dateTime(value: Date | null): DateTime | null {
    if (!value) return null
    return DateTime.fromJSDate(value)
  }

  /**
   * `date` column as `YYYY-MM-DD` text, the same as Lucid's `serialize`
   * put on the wire. A calendar day is not an instant: as text, it does not move with the
   * reader's time zone.
   */
  static calendarDate(value: DateTime): string {
    // The `date` column comes from the database: Luxon only hydrates it valid, and `toFormat`
    // does not throw even for an invalid `DateTime`.
    return value.toFormat('yyyy-LL-dd')
  }

  /**
   * Whether the error the database returned is a violation of the `UNIQUE` index
   * (`unique_violation`, SQLSTATE `23505`).
   */
  static isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false
    if (!('code' in error)) return false

    return error.code === '23505'
  }

  /**
   * The write, or the `UniqueConflict` fact when the `UNIQUE` index blocked it.
   * Any other database failure becomes the `RepositoryFailure` fact, with the
   * cause: it is infrastructure, and the use-case logs it and answers `500`.
   */
  static async unlessUnique<Value>(
    work: Promise<Value>,
  ): Promise<Either<UniqueConflict | RepositoryFailure, Value>> {
    try {
      return right(await work)
    } catch (error) {
      if (LucidMapping.isUniqueViolation(error)) return left(UNIQUE_CONFLICT)

      return left(RepositoryFailure.of(error))
    }
  }

  static fromCalendarDate(value: string): DateTime {
    return DateTime.fromISO(value)
  }

  /**
   * The requested page, ordered by the criterion's column. Built by hand from the
   * paginator (_doc-lib/lucid.md#pagination): `all()` keeps the row type, and
   * the `{ meta, data }` comes out in the shared `Paginated`.
   */
  static async page<Row, Item>(
    query: PageableQuery<Row>,
    criteria: PageCriteria<string>,
    toItem: (row: Row) => Item,
  ): Promise<Paginated<Item>> {
    const page = await query
      .orderBy(criteria.sort, criteria.direction)
      .paginate(criteria.page, criteria.perPage)

    return {
      meta: page.getMeta(),
      data: page.all().map((row) => toItem(row)),
    }
  }

  /**
   * How many rows the query reaches. Postgres `count` comes back as `bigint`,
   * which the driver delivers as a string so as not to lose precision: without the `Number` the
   * response would come out quoted.
   */
  static async count(query: CountableQuery): Promise<number> {
    const [row] = await query.count('* as total')
    return Number(row?.$extras.total ?? 0)
  }

  /** The same text that Luxon's `toJSON()` puts on the wire. */
  private static iso(value: DateTime | null): string | null {
    if (!value) return null
    return value.toISO()
  }
}
