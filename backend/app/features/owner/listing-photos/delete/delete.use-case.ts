import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@aporta/shared'

import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import StorageOrphans from '#features/_shared.storage-orphans'
import ListingRefusal from '#features/owner/_shared.listing-refusal'
import ListingRepository from '#repositories/listing/listing.repository'
import StorageRepository from '#repositories/storage/storage.repository'
import StorageContract from '#services/storage/storage.contract'
import type { OwnerListingPhotoDeletePayload } from '#validators/owner/listing-photos.validator'

type Payload = OwnerListingPhotoDeletePayload
type Response = Either<HTTPException, null>

/**
 * Takes one picture off the owner's ad. Who may was decided by `ListingPolicy` in the controller;
 * which photo and what the others become (they move up) is `Listing.removePhoto`.
 *
 * Like `attachPhotos`, it does not touch the status: only `update` hands a refused ad back to the
 * review, so the owner's "I fixed it" stays one button and a published ad does not leave the air
 * for losing a picture.
 *
 * After the row is gone, `StorageOrphans.sweep` drops the binary **only if nothing else points at
 * it** (the demo seed shares pictures between ads). The removal is already saved and is the
 * answer: a bucket that fails here is logged and left for `storages:prune`, never undone, because
 * the owner asked for the photo to go and it went.
 */
@inject()
export default class OwnerListingPhotoDeleteUseCase {
  constructor(
    private readonly listings: ListingRepository,
    private readonly storages: StorageRepository,
    private readonly storage: StorageContract,
  ) {}

  async execute({ id, photoId }: Payload): Promise<Response> {
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

      const removed = listing.removePhoto(photoId)

      if (removed.isLeft()) return left(ListingRefusal.http(removed.value))

      const saved = await this.listings.save(listing)

      if (saved.isLeft()) return left(this.failure(saved.value))

      await this.sweep(removed.value.storageId)

      return right(null)
    } catch (error) {
      return left(this.failure(error))
    }
  }

  /** A slot with no picture (`storageId` null) has no file to let go of. */
  private async sweep(storageId: string | null): Promise<void> {
    if (storageId === null) return

    try {
      const swept = await StorageOrphans.sweep(
        [storageId],
        this.storages,
        this.storage,
      )

      if (swept.isLeft())
        logger.warn(
          { err: swept.value, storageId },
          '[owner/listing-photos > delete][orphan-left-behind]',
        )
    } catch (error) {
      logger.warn(
        { err: error, storageId },
        '[owner/listing-photos > delete][orphan-left-behind]',
      )
    }
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[owner/listing-photos > delete][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.OWNER_LISTING_PHOTO_DELETE_ERROR'),
      'OWNER_LISTING_PHOTO_DELETE_ERROR',
    )
  }
}
