import type { Paginated } from '@aporta/shared'

import MemoryRows from '#core/memory-rows'
import Place, { type PlaceProps } from '#domain/place/place.entity'
import PlaceRepository, {
  type PlaceListCriteria,
  type PlaceNeighborhood,
  type PlaceRecord,
} from '#repositories/place/place.repository'

type Row = PlaceProps

/**
 * The in-memory place repository (`_standards/domain.md` §5.3): what the use-case unit tests use,
 * and the contract test runs the same cases against it as against Lucid. `put` and
 * `putNeighborhood` are how a spec seeds it: the contract has no write yet.
 */
export default class PlaceMemoryRepository extends PlaceRepository {
  readonly #rows = new Map<string, Row>()
  readonly #neighborhoods = new Map<string, PlaceNeighborhood>()

  /** A neighborhood the places can point to, by the key the entity carries. */
  putNeighborhood(id: string, neighborhood: PlaceNeighborhood): void {
    this.#neighborhoods.set(id, structuredClone(neighborhood))
  }

  put(place: Place): void {
    const snapshot = place.snapshot()

    this.#rows.set(snapshot.id, structuredClone(snapshot))
  }

  paginate(criteria: PlaceListCriteria): Promise<Paginated<PlaceRecord>> {
    // Only the rows that have a neighborhood, which is every row Postgres can hold: the foreign
    // key makes a place without one impossible, so here it is not visible, instead of a read that
    // throws.
    const found: Array<PlaceRecord> = []

    for (const row of this.#rows.values()) {
      const neighborhood = this.#neighborhoods.get(row.neighborhoodId)
      if (neighborhood && this.matches(row, criteria))
        found.push({
          place: Place.restore(structuredClone(row)),
          neighborhood: structuredClone(neighborhood),
        })
    }

    return Promise.resolve(
      MemoryRows.page(found, criteria, {
        sortValue: (record) => record.place.snapshot()[criteria.sort],
        toItem: (record) => record,
      }),
    )
  }

  private matches(row: Row, criteria: PlaceListCriteria): boolean {
    return (
      row.deletedAt === null &&
      (criteria.category === undefined || row.category === criteria.category) &&
      MemoryRows.contains([row.name, row.description], criteria.search)
    )
  }
}
