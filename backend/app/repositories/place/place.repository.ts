import type {
  Either,
  Merge,
  PLACE_SORT_COLUMNS,
  Paginated,
  PlaceCategory,
  TrashedMode,
} from '@aporta/shared'

import type { PageCriteria } from '#core/page-criteria'
import type RepositoryFailure from '#core/repository-failure'
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

/**
 * The guide listing: by tab of the guide, with a search in name and description. Without
 * `trashed` it is the storefront's cut, the live ones; the staff asks for `only` (the archive
 * screen) or `with` on purpose, so a read that does not ask cannot show an archived place.
 */
export type PlaceListCriteria = Merge<
  PageCriteria<PlaceSortColumn>,
  { readonly category?: PlaceCategory; readonly trashed?: TrashedMode }
>

/**
 * The guide place persistence, by intent (`_standards/domain.md` §5.1). The storefront reads
 * `paginate` with no `trashed`; the staff's panel curates the guide through the rest.
 */
export default abstract class PlaceRepository {
  abstract paginate(
    criteria: PlaceListCriteria,
  ): Promise<Paginated<PlaceRecord>>

  /** The place for the staff's read or write: **trash included**, so archiving twice is a 409 and not a 404. */
  abstract findAnyRecordById(id: string): Promise<PlaceRecord | null>

  /** Writes the place and returns it as it ended up, in any state (an archive is a save too). */
  abstract save(place: Place): Promise<Either<RepositoryFailure, PlaceRecord>>

  /** Removes the row for good. Whether the place may go (only the archived) is the entity's rule. */
  abstract delete(place: Place): Promise<void>
}
