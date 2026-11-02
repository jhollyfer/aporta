import type { StorefrontListingShowResponse } from '@aporta/shared'

import ListingPhotoUrls from '#features/_shared.listing-photo-urls'
import ListingSharedPresenter from '#features/_shared.listing.presenter'
import type { ListingRecord } from '#repositories/listing/listing.repository'

/**
 * The listing as the visitor reads it (`_standards/architecture.md` §10), by allowlist. The fields
 * are the shared ones (`ListingSharedPresenter`); what this presenter adds is the photos, and
 * what it leaves out is the panel's: `status` (only the published one gets here), `ownerId` and
 * the photos' `storageId`, because the visitor gets the signed address and never the `storages`
 * row.
 */
export default class ListingPresenter {
  static show(
    record: ListingRecord,
    urls: ReadonlyMap<string, string>,
  ): StorefrontListingShowResponse {
    return {
      ...ListingSharedPresenter.fields(record),
      // `url: null` is the contract for "no photo yet", and the frontend draws the room.
      photos: record.listing.snapshot().photos.map((photo) => ({
        id: photo.id,
        environment: photo.environment,
        url: ListingPhotoUrls.of(urls, photo.storageId),
      })),
    }
  }
}
