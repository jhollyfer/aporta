import type { Paginated } from '@aporta/shared'

import MemoryRows from '#core/memory-rows'
import Neighborhood, {
  type NeighborhoodProps,
} from '#domain/neighborhood/neighborhood.entity'
import NeighborhoodRepository, {
  type NeighborhoodListCriteria,
} from '#repositories/neighborhood/neighborhood.repository'

type Row = NeighborhoodProps

/**
 * The in-memory neighborhood repository (`_standards/domain.md` §5.3): what the use-case unit
 * tests use, and the contract test runs the same cases against it as against Lucid. `put` is how
 * a spec seeds it: the contract has no write yet, because nothing in the API writes a neighborhood.
 */
export default class NeighborhoodMemoryRepository extends NeighborhoodRepository {
  readonly #rows = new Map<string, Row>()

  put(neighborhood: Neighborhood): void {
    const snapshot = neighborhood.snapshot()

    this.#rows.set(snapshot.id, structuredClone(snapshot))
  }

  paginate(
    criteria: NeighborhoodListCriteria,
  ): Promise<Paginated<Neighborhood>> {
    const rows = [...this.#rows.values()].filter(
      (row) =>
        row.deletedAt === null &&
        MemoryRows.contains([row.name], criteria.search),
    )

    return Promise.resolve(
      MemoryRows.page(rows, criteria, {
        sortValue: (row) => row[criteria.sort],
        toItem: (row) => this.entity(row),
      }),
    )
  }

  private entity(row: Row): Neighborhood {
    return Neighborhood.restore(structuredClone(row))
  }
}
