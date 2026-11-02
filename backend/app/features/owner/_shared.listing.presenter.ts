import type { OwnerListingShowResponse } from '@aporta/shared'

import ListingPhotoUrls from '#features/_shared.listing-photo-urls'
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
      photos: listing.photos.map((photo) => ({
        id: photo.id,
        environment: photo.environment,
        storageId: photo.storageId,
        url: ListingPhotoUrls.of(urls, photo.storageId),
      })),
    }
  }
}
