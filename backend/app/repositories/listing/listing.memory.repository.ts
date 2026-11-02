import type { Paginated } from '@aporta/shared'

import MemoryRows, { type SortValue, type StoredRow } from '#core/memory-rows'
import Listing, { type ListingProps } from '#domain/listing/listing.entity'
import ListingRepository, {
  type ListingNeighborhood,
  type ListingPublishedCriteria,
  type ListingRecord,
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
 * use, and the contract test runs the same cases against it as against Lucid. `put` and
 * `putNeighborhood` are how a spec seeds it: the contract has no write yet.
 *
 * The rules a query would apply are the entity's (`isPublished`, `monthlyEquivalent`), so the two
 * implementations answer the same question from the same definition.
 */
export default class ListingMemoryRepository extends ListingRepository {
  readonly #rows = new Map<string, Row>()
  readonly #neighborhoods = new Map<string, ListingNeighborhood>()

  /** A neighborhood the listings can point to, by the key the entity carries. */
  putNeighborhood(id: string, neighborhood: ListingNeighborhood): void {
    this.#neighborhoods.set(id, structuredClone(neighborhood))
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
    criteria: ListingPublishedCriteria,
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
      MemoryRows.contains([row.title, row.description], criteria.search)
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

  private record({ row, neighborhood }: Stored): ListingRecord {
    const { props, createdAt, updatedAt } = this.split(row)

    return {
      listing: Listing.restore(props),
      neighborhood: structuredClone(neighborhood),
      createdAt,
      updatedAt: updatedAt ?? createdAt,
    }
  }
}
