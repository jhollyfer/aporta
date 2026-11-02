import type { AdministratorListingShowResponse } from '@aporta/shared'

import { WireDate } from '#core/response'
import ListingSharedPresenter from '#features/_shared.listing.presenter'
import type { ListingRecord } from '#repositories/listing/listing.repository'

/**
 * The ad as the staff reads it (`_standards/architecture.md` §10), by allowlist: the owner's shape
 * (the shared fields, the `status`, the photos with their file keys) plus what the review needs, the
 * account behind the ad with the e-mail to reach it, when the ad went on the air and left it, and
 * who made the last decision. Never `ownerId` (the `account.id` is the same fact, named for what it
 * is) nor the reporter hashes.
 */
export default class AdministratorListingPresenter {
  static show(
    record: ListingRecord,
    urls: ReadonlyMap<string, string>,
  ): AdministratorListingShowResponse {
    const listing = record.listing.snapshot()

    return {
      ...ListingSharedPresenter.fields(record),
      status: listing.status,
      photos: ListingSharedPresenter.keyedPhotos(record, urls),
      publishedAt: WireDate.isoOrNull(listing.publishedAt),
      archivedAt: WireDate.isoOrNull(listing.deletedAt),
      account: AdministratorListingPresenter.account(record),
      review: AdministratorListingPresenter.review(record),
    }
  }

  private static account(
    record: ListingRecord,
  ): AdministratorListingShowResponse['account'] {
    const { account } = record
    if (!account) return null

    return {
      id: account.id,
      name: account.name,
      email: account.email,
      verified: account.verifiedAt !== null,
    }
  }

  private static review(
    record: ListingRecord,
  ): AdministratorListingShowResponse['review'] {
    const { review } = record.listing.snapshot()
    if (!review) return null

    return {
      note: review.note,
      reviewedAt: WireDate.iso(review.at),
      reviewedBy: review.by,
    }
  }
}
