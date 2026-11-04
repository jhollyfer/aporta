import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Either,
  type Merge,
  type OwnerListingPhotoReorderResponse,
} from '@aporta/shared'

import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import ListingPhotoUrls from '#features/_shared.listing-photo-urls'
import ListingRefusal from '#features/owner/_shared.listing-refusal'
import ListingPresenter from '#features/owner/_shared.listing.presenter'
import ListingRepository from '#repositories/listing/listing.repository'
import StorageContract from '#services/storage/storage.contract'
import type { OwnerListingPhotoReorderPayload } from '#validators/owner/listing-photos.validator'

type Payload = Merge<OwnerListingPhotoReorderPayload, { readonly id: string }>
type Response = Either<HTTPException, OwnerListingPhotoReorderResponse>

/**
 * Puts the gallery of the owner's ad in the order given. Who may was decided by `ListingPolicy`
 * in the controller; that the list is exactly the photos the ad has is `Listing.reorderPhotos`.
 * Like the other photo actions it leaves the status alone: only `update` hands a refused ad back
 * to the review.
 */
@inject()
export default class OwnerListingPhotoReorderUseCase {
  constructor(
    private readonly listings: ListingRepository,
    private readonly storage: StorageContract,
  ) {}

  async execute({ id, photoIds }: Payload): Promise<Response> {
    try {
      const listing = await this.listings.findById(id)

      // The policy just read it; vanishing in between is the same `404` as never having been.
      if (!listing)
        return left(
          HTTPException.NotFound(
            Translation.t('errors.LISTING_NOT_FOUND'),
            'LISTING_NOT_FOUND',
          ),
        )

      const ordered = listing.reorderPhotos(photoIds)

      if (ordered.isLeft()) return left(ListingRefusal.http(ordered.value))

      const saved = await this.listings.save(listing)

      if (saved.isLeft()) return left(this.failure(saved.value))

      const urls = await ListingPhotoUrls.sign([saved.value], this.storage)

      return right(ListingPresenter.show(saved.value, urls))
    } catch (error) {
      return left(this.failure(error))
    }
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[owner/listing-photos > reorder][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.OWNER_LISTING_PHOTO_REORDER_ERROR'),
      'OWNER_LISTING_PHOTO_REORDER_ERROR',
    )
  }
}
