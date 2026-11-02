import type { OwnerListingShowResponse } from '@aporta/shared'

import { WireDate } from '#core/response'
import ListingSharedPresenter from '#features/_shared.listing.presenter'
import type { ListingRecord } from '#repositories/listing/listing.repository'

/**
 * The listing as its owner reads it (`_standards/architecture.md` §10), by allowlist: the shared
 * fields, plus the `status` (an ad waiting for review looks different from one on the air) and
 * the `storageId` of each photo, so the screen can tell which file a slot holds. Never `ownerId`
 * nor `deletedAt`: the account is the session's, and an ad in the trash is not read.
 *
 * It sits at the root of the module because two resources answer this shape: `owner/listings`
 * and `owner/listing-photos`, which answers with the whole ad, and a feature does not import
 * another one.
 */
export default class ListingPresenter {
  static show(
    record: ListingRecord,
    urls: ReadonlyMap<string, string>,
  ): OwnerListingShowResponse {
    const listing = record.listing.snapshot()

    return {
      ...ListingSharedPresenter.fields(record),
      status: listing.status,
      review: ListingPresenter.review(record),
      photos: ListingSharedPresenter.keyedPhotos(record, urls),
    }
  }

  /** The staff's last decision as the owner reads it: the reason and when, never who decided. */
  private static review(
    record: ListingRecord,
  ): OwnerListingShowResponse['review'] {
    const { review } = record.listing.snapshot()
    if (!review) return null

    return { note: review.note, reviewedAt: WireDate.iso(review.at) }
  }
}
