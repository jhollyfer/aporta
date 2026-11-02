import {
  left,
  right,
  type Either,
  type Paginated,
  type StorageFileShowResponse,
} from '@aporta/shared'

import MemoryRows, { type SortValue, type StoredRow } from '#core/memory-rows'
import RepositoryFailure from '#core/repository-failure'
import { UNIQUE_CONFLICT, type UniqueConflict } from '#core/unique-conflict'
import Listing, { type ListingProps } from '#domain/listing/listing.entity'
import ListingRepository, {
  type ListingAccount,
  type ListingNeighborhood,
  type ListingOwnedCriteria,
  type ListingPinsCriteria,
  type ListingPinsResult,
  type ListingPublishedCriteria,
  type ListingPublishedFilters,
  type ListingRecord,
  type ListingReviewCriteria,
  type ListingSortColumn,
} from '#repositories/listing/listing.repository'

type Row = StoredRow<ListingProps>

/** A row with the neighborhood it points to. */
type Stored = { readonly row: Row; readonly neighborhood: ListingNeighborhood }

/** The instants a spec may fix, so the order by date has something to order. */
export type ListingStamps = {
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * The in-memory listing repository (`_standards/domain.md` §5.3): what the use-case unit tests
 * use, and the contract test runs the same cases against it as against Lucid. `put`,
 * `putNeighborhood` and `putFile` are how a spec seeds it without going through `save`.
 *
 * The rules a query would apply are the entity's (`isPublished`, `monthlyEquivalent`), so the two
 * implementations answer the same question from the same definition.
 */
export default class ListingMemoryRepository extends ListingRepository {
  readonly #rows = new Map<string, Row>()
  readonly #neighborhoods = new Map<string, ListingNeighborhood>()
  readonly #files = new Map<string, StorageFileShowResponse>()
  readonly #accounts = new Map<string, ListingAccount>()

  /** A neighborhood the listings can point to, by the key the entity carries. */
  putNeighborhood(id: string, neighborhood: ListingNeighborhood): void {
    this.#neighborhoods.set(id, structuredClone(neighborhood))
  }

  /** The account an ad points to by `ownerId`: its seal is the one the record reports. */
  putAccount(account: ListingAccount): void {
    this.#accounts.set(account.id, structuredClone(account))
  }

  /** A live `UPLOADED` file a photo may show, by the key the photo carries. */
  putFile(file: StorageFileShowResponse): void {
    this.#files.set(file.id, structuredClone(file))
  }

  findById(id: string): Promise<Listing | null> {
    const row = this.#rows.get(id)
    if (!row || row.deletedAt !== null) return Promise.resolve(null)

    return Promise.resolve(this.entity(row))
  }

  findRecordById(id: string): Promise<ListingRecord | null> {
    const found = this.visible().find(({ row }) => row.id === id)
    if (!found || found.row.deletedAt !== null) return Promise.resolve(null)

    return Promise.resolve(this.record(found))
  }

  findAnyById(id: string): Promise<Listing | null> {
    const row = this.#rows.get(id)
    if (!row) return Promise.resolve(null)

    return Promise.resolve(this.entity(row))
  }

  findAnyRecordById(id: string): Promise<ListingRecord | null> {
    const found = this.visible().find(({ row }) => row.id === id)
    if (!found) return Promise.resolve(null)

    return Promise.resolve(this.record(found))
  }

  paginateForReview(
    criteria: ListingReviewCriteria,
  ): Promise<Paginated<ListingRecord>> {
    const found = this.visible().filter(
      ({ row }) =>
        (criteria.status === undefined || row.status === criteria.status) &&
        MemoryRows.contains([row.title, row.description], criteria.search),
    )

    return Promise.resolve(
      MemoryRows.page(found, criteria, {
        sortValue: ({ row }) => this.sortValue(row, criteria.sort),
        toItem: (each) => this.record(each),
      }),
    )
  }

  paginateOwned(
    criteria: ListingOwnedCriteria,
  ): Promise<Paginated<ListingRecord>> {
    const found = this.visible().filter(
      ({ row }) =>
        row.deletedAt === null &&
        row.ownerId === criteria.ownerId &&
        (criteria.status === undefined || row.status === criteria.status) &&
        MemoryRows.contains([row.title, row.description], criteria.search),
    )

    return Promise.resolve(
      MemoryRows.page(found, criteria, {
        sortValue: ({ row }) => this.sortValue(row, criteria.sort),
        toItem: (each) => this.record(each),
      }),
    )
  }

  /**
   * What Postgres refuses becomes the same fact here: a taken `slug` is `UniqueConflict`, and a
   * neighborhood that does not exist is a failure, like the foreign key.
   */
  save(
    listing: Listing,
  ): Promise<Either<UniqueConflict | RepositoryFailure, ListingRecord>> {
    const snapshot = listing.snapshot()

    for (const row of this.#rows.values()) {
      if (row.slug === snapshot.slug && row.id !== snapshot.id)
        return Promise.resolve(left(UNIQUE_CONFLICT))
    }

    if (!this.#neighborhoods.has(snapshot.neighborhoodId))
      return Promise.resolve(
        left(RepositoryFailure.of(new Error('neighborhood does not exist'))),
      )

    this.put(listing)

    const saved = this.visible().find(({ row }) => row.id === snapshot.id)
    if (!saved)
      return Promise.resolve(
        left(RepositoryFailure.of(new Error('listing vanished after save'))),
      )

    return Promise.resolve(right(this.record(saved)))
  }

  put(listing: Listing, stamps?: ListingStamps): void {
    const snapshot = listing.snapshot()
    const row = MemoryRows.stamp(
      snapshot,
      this.#rows.get(snapshot.id),
      new Date(),
    )

    this.#rows.set(row.id, { ...row, ...stamps })
  }

  findPublishedRecordBySlug(slug: string): Promise<ListingRecord | null> {
    const found = this.visible().find(({ row }) => row.slug === slug)
    if (!found || !this.entity(found.row).isPublished())
      return Promise.resolve(null)

    return Promise.resolve(this.record(found))
  }

  paginatePublished(
    criteria: ListingPublishedCriteria,
  ): Promise<Paginated<ListingRecord>> {
    const found = this.visible().filter((each) => this.matches(each, criteria))

    return Promise.resolve(
      MemoryRows.page(found, criteria, {
        sortValue: ({ row }) => this.sortValue(row, criteria.sort),
        toItem: (each) => this.record(each),
      }),
    )
  }

  findPublishedPins(criteria: ListingPinsCriteria): Promise<ListingPinsResult> {
    const found = this.visible()
      .filter((each) => this.matches(each, criteria))
      // The same order as the Lucid query: newest first, `id` as the tie-break.
      .sort(
        (a, b) =>
          b.row.createdAt.getTime() - a.row.createdAt.getTime() ||
          a.row.id.localeCompare(b.row.id),
      )

    return Promise.resolve({
      total: found.length,
      pins: found.slice(0, criteria.limit).map(({ row }) => ({
        id: row.id,
        slug: row.slug,
        type: row.type,
        lat: row.lat,
        lng: row.lng,
        priceMonthly: row.priceMonthly,
        priceDaily: row.priceDaily,
      })),
    })
  }

  /**
   * The rows that have a neighborhood, which is every row Postgres can hold: the foreign key makes
   * a listing without one impossible, so here it is simply not visible, instead of a read that
   * throws.
   */
  private visible(): Array<Stored> {
    const found: Array<Stored> = []

    for (const row of this.#rows.values()) {
      const neighborhood = this.#neighborhoods.get(row.neighborhoodId)
      if (neighborhood) found.push({ row, neighborhood })
    }

    return found
  }

  private matches(
    { row, neighborhood }: Stored,
    criteria: ListingPublishedFilters,
  ): boolean {
    const listing = this.entity(row)
    const price = listing.monthlyEquivalent()

    return (
      listing.isPublished() &&
      (criteria.type === undefined || row.type === criteria.type) &&
      (criteria.neighborhood === undefined ||
        neighborhood.slug === criteria.neighborhood) &&
      (criteria.period === undefined ||
        row.periods.includes(criteria.period)) &&
      (criteria.minPrice === undefined || price >= criteria.minPrice) &&
      (criteria.maxPrice === undefined || price <= criteria.maxPrice) &&
      this.within(row, criteria) &&
      MemoryRows.contains([row.title, row.description], criteria.search)
    )
  }

  /** Inside the map window, edges included, as the SQL `between`. */
  private within(row: Row, { bounds }: ListingPublishedFilters): boolean {
    if (!bounds) return true

    return (
      row.lat >= bounds.minLat &&
      row.lat <= bounds.maxLat &&
      row.lng >= bounds.minLng &&
      row.lng <= bounds.maxLng
    )
  }

  private sortValue(row: Row, sort: ListingSortColumn): SortValue {
    const values = {
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      price: this.entity(row).monthlyEquivalent(),
    } satisfies Record<ListingSortColumn, SortValue>

    return values[sort]
  }

  private entity(row: Row): Listing {
    return Listing.restore(this.split(row).props)
  }

  /** The row apart: what the entity owns, and the stamps persistence adds. */
  private split(row: Row) {
    const { createdAt, updatedAt, ...props } = structuredClone(row)

    return { props, createdAt, updatedAt }
  }

  /** The files the photos show, only the ones that were put: the others are slots with no picture. */
  private filesOf(props: ListingProps): StorageFileShowResponse[] {
    const files: StorageFileShowResponse[] = []

    for (const photo of props.photos) {
      const file = this.#files.get(photo.storageId ?? '')
      if (file) files.push(structuredClone(file))
    }

    return files
  }

  private record({ row, neighborhood }: Stored): ListingRecord {
    const { props, createdAt, updatedAt } = this.split(row)

    const account = this.accountOf(props)

    return {
      listing: Listing.restore(props),
      neighborhood: structuredClone(neighborhood),
      account,
      // The same rule as Lucid: the account's seal when there is an account, the ad's own otherwise.
      ownerVerifiedAt: this.sealOf(account, props),
      files: this.filesOf(props),
      createdAt,
      updatedAt: updatedAt ?? createdAt,
    }
  }

  private accountOf(props: ListingProps): ListingAccount | null {
    const account = this.#accounts.get(props.ownerId ?? '')
    if (!account) return null

    return structuredClone(account)
  }

  private sealOf(
    account: ListingAccount | null,
    props: ListingProps,
  ): Date | null {
    if (account) return account.verifiedAt

    return props.owner.verifiedAt
  }
}
