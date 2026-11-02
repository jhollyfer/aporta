import type {
  PLACE_SORT_COLUMNS,
  Paginated,
  PlaceCategory,
  Merge,
} from '@aporta/shared'

import type { PageCriteria } from '#core/page-criteria'
import type Place from '#domain/place/place.entity'

/**
 * The neighborhood a place sits in, reduced to what the card draws: the entity points to it only
 * by id (`_standards/domain.md` §1), and the read brings the name along.
 */
export type PlaceNeighborhood = {
  readonly slug: string
  readonly name: string
}

/** The place as it is read: the entity and its neighborhood. */
export type PlaceRecord = {
  readonly place: Place
  readonly neighborhood: PlaceNeighborhood
}

export type PlaceSortColumn = (typeof PLACE_SORT_COLUMNS)[number]

/** The storefront listing: outside the trash, by tab of the guide, with a search in name and description. */
export type PlaceListCriteria = Merge<
  PageCriteria<PlaceSortColumn>,
  { readonly category?: PlaceCategory }
>

/**
 * The guide place persistence, by intent (`_standards/domain.md` §5.1). Read only for now: the
 * curation enters through the seeder, and the panel that writes it is later work.
 */
export default abstract class PlaceRepository {
  abstract paginate(
    criteria: PlaceListCriteria,
  ): Promise<Paginated<PlaceRecord>>
}
