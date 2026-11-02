import type {
  LISTING_SORT_COLUMNS,
  ListingPeriod,
  ListingType,
  Merge,
  Paginated,
} from '@aporta/shared'

import type { PageCriteria } from '#core/page-criteria'
import type Listing from '#domain/listing/listing.entity'

/**
 * The neighborhood a listing sits in, reduced to what the card draws: the entity points to it only
 * by id (`_standards/domain.md` §1), and the read brings the slug and the name along.
 */
export type ListingNeighborhood = {
  readonly slug: string
  readonly name: string
}

/** The listing as it is read: the entity, its neighborhood and the time stamps. */
export type ListingRecord = {
  readonly listing: Listing
  readonly neighborhood: ListingNeighborhood
  readonly createdAt: Date
  readonly updatedAt: Date
}

export type ListingSortColumn = (typeof LISTING_SORT_COLUMNS)[number]

/**
 * The storefront listing: only what is published and outside the trash, with a search in title
 * and description. The price range compares against `Listing.monthlyEquivalent`, so a hotel that
 * quotes the day still falls in the range the visitor typed in months.
 */
export type ListingPublishedCriteria = Merge<
  PageCriteria<ListingSortColumn>,
  {
    readonly type?: ListingType
    /** The `slug` of a neighborhood. */
    readonly neighborhood?: string
    readonly period?: ListingPeriod
    readonly minPrice?: number
    readonly maxPrice?: number
  }
>

/**
 * The listing persistence, by intent (`_standards/domain.md` §5.1). Read only for now: the
 * ads enter through the seeder, and the owner's `POST` (`docs/TASKS.md`, phase 3) adds the write
 * with its own tests. Everything here answers the public storefront, so every read is cut to
 * `PUBLISHED` outside the trash inside the implementation; a draft, a pending or an archived ad
 * is indistinguishable from one that does not exist.
 */
export default abstract class ListingRepository {
  /** The ad the storefront shows, by `slug`: `PUBLISHED` and outside the trash. */
  abstract findPublishedRecordBySlug(
    slug: string,
  ): Promise<ListingRecord | null>

  abstract paginatePublished(
    criteria: ListingPublishedCriteria,
  ): Promise<Paginated<ListingRecord>>
}
