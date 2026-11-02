import type { NEIGHBORHOOD_SORT_COLUMNS, Paginated } from '@aporta/shared'

import type { PageCriteria } from '#core/page-criteria'
import type Neighborhood from '#domain/neighborhood/neighborhood.entity'

export type NeighborhoodSortColumn = (typeof NEIGHBORHOOD_SORT_COLUMNS)[number]

/** The storefront listing: outside the trash, with a search in the name. */
export type NeighborhoodListCriteria = PageCriteria<NeighborhoodSortColumn>

/**
 * The neighborhood persistence, by intent (`_standards/domain.md` §5.1). Read only for now: the
 * neighborhoods enter through the seeder, and the panel that writes them is later work
 * (`docs/TASKS.md`).
 */
export default abstract class NeighborhoodRepository {
  /** The neighborhoods outside the trash. The slug is `UNIQUE` across the whole table. */
  abstract paginate(
    criteria: NeighborhoodListCriteria,
  ): Promise<Paginated<Neighborhood>>
}
