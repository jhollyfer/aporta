import type {
  Either,
  LISTING_SORT_COLUMNS,
  ListingPeriod,
  ListingStatus,
  ListingType,
  Merge,
  Paginated,
  StorageFileShowResponse,
} from '@aporta/shared'

import type { PageCriteria } from '#core/page-criteria'
import type RepositoryFailure from '#core/repository-failure'
import type { UniqueConflict } from '#core/unique-conflict'
import type Listing from '#domain/listing/listing.entity'

/**
 * The neighborhood a listing sits in, reduced to what the card draws: the entity points to it only
 * by id (`_standards/domain.md` §1), and the read brings the slug and the name along.
 */
export type ListingNeighborhood = {
  readonly slug: string
  readonly name: string
}

/**
 * The account behind an ad, as the staff reads it. It is the person who wrote the ad, and the seal
 * (`verifiedAt`) is theirs, not the ad's.
 */
export type ListingAccount = {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly verifiedAt: Date | null
}

/**
 * The listing as it is read: the entity, its neighborhood, the files its photos show and the time
 * stamps. `files` carries only the live `UPLOADED` ones, still without `url` (signing is bucket
 * I/O, the use-case's): a photo whose file is missing from here is read as "no picture yet".
 */
export type ListingRecord = {
  readonly listing: Listing
  readonly neighborhood: ListingNeighborhood
  /** The account that wrote the ad; null for an ad seeded before owners had accounts. */
  readonly account: ListingAccount | null
  /**
   * The "verified owner" seal as the reader sees it: the account's when the ad has one, and the
   * ad's own denormalized column only for the ads with no account. Decided here, once, so a
   * presenter never has to know there are two places.
   */
  readonly ownerVerifiedAt: Date | null
  readonly files: ReadonlyArray<StorageFileShowResponse>
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
 * The owner's own listing: outside the trash, whatever the status, cut to one account. The
 * account comes from the session and never from the client, and the cut is inside the query,
 * so there is no read that crosses accounts and is denied afterwards.
 */
export type ListingOwnedCriteria = Merge<
  PageCriteria<ListingSortColumn>,
  {
    readonly ownerId: string
    readonly status?: ListingStatus
  }
>

/**
 * The staff's list: every ad of the platform, **trash included** (an archived ad is in the trash by
 * definition, so a staff list that cut it could never show `ARCHIVED`), by status if asked.
 */
export type ListingReviewCriteria = Merge<
  PageCriteria<ListingSortColumn>,
  { readonly status?: ListingStatus }
>

/**
 * The listing persistence, by intent (`_standards/domain.md` §5.1). The storefront reads
 * (`findPublishedRecordBySlug`, `paginatePublished`) are cut to `PUBLISHED` outside the trash
 * inside the implementation; a draft, a pending or an archived ad is indistinguishable from one
 * that does not exist. The owner's reads (`findById`, `findRecordById`, `paginateOwned`) see
 * every status outside the trash, and who may act on what they return is the policy's.
 */
export default abstract class ListingRepository {
  /** The ad for a write or an authorization: any status, outside the trash. */
  abstract findById(id: string): Promise<Listing | null>

  /** The ad as it is read, with neighborhood and files: any status, outside the trash. */
  abstract findRecordById(id: string): Promise<ListingRecord | null>

  /** The ad for the staff's write: any status, **trash included**, so archiving twice is a 409 and not a 404. */
  abstract findAnyById(id: string): Promise<Listing | null>

  /** The ad as the staff reads it, with the account behind it: any status, trash included. */
  abstract findAnyRecordById(id: string): Promise<ListingRecord | null>

  abstract paginateForReview(
    criteria: ListingReviewCriteria,
  ): Promise<Paginated<ListingRecord>>

  abstract paginateOwned(
    criteria: ListingOwnedCriteria,
  ): Promise<Paginated<ListingRecord>>

  /**
   * Writes the ad and its photos in the order the entity carries them, in one transaction, and
   * returns it as it ended up. The `slug` is `UNIQUE`: another write taking it between the
   * use-case lookup and the `INSERT` comes back as `UniqueConflict`, which is the use-case's to
   * retry with another suffix.
   */
  abstract save(
    listing: Listing,
  ): Promise<Either<UniqueConflict | RepositoryFailure, ListingRecord>>

  /** The ad the storefront shows, by `slug`: `PUBLISHED` and outside the trash. */
  abstract findPublishedRecordBySlug(
    slug: string,
  ): Promise<ListingRecord | null>

  abstract paginatePublished(
    criteria: ListingPublishedCriteria,
  ): Promise<Paginated<ListingRecord>>
}
