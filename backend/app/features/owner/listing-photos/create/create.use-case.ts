import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  IMAGE_MIMETYPES,
  left,
  right,
  type Actor,
  type Either,
  type Merge,
  type OwnerListingPhotoCreateResponse,
} from '@aporta/shared'

import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import ListingPhotoUrls from '#features/_shared.listing-photo-urls'
import ListingRefusal from '#features/owner/_shared.listing-refusal'
import ListingPresenter from '#features/owner/_shared.listing.presenter'
import ListingRepository from '#repositories/listing/listing.repository'
import StorageRepository from '#repositories/storage/storage.repository'
import IdGeneratorContract from '#services/id-generator/id-generator.contract'
import StorageContract from '#services/storage/storage.contract'
import type { OwnerListingPhotoCreatePayload } from '#validators/owner/listing-photos.validator'

type Payload = Merge<
  OwnerListingPhotoCreatePayload,
  { readonly id: string; readonly actor: Actor }
>
type Response = Either<HTTPException, OwnerListingPhotoCreateResponse>

/**
 * Puts uploaded pictures on the owner's ad. Who may touch the ad was decided by `ListingPolicy` in
 * the controller; what this checks is the files.
 *
 * The question "are these mine, finished and images" is one repository call
 * (`StorageRepository.allUploadedBy`), asked **before** the write: `storage_id` is a foreign key,
 * and a file of another account is the hole this closes. A file that is not the actor's answers
 * like one that does not exist, so the response cannot be used to learn which uuids are files.
 * The ceiling and the repeated file are the entity's.
 */
@inject()
export default class OwnerListingPhotoCreateUseCase {
  constructor(
    private readonly listings: ListingRepository,
    private readonly storages: StorageRepository,
    private readonly storage: StorageContract,
    private readonly ids: IdGeneratorContract,
  ) {}

  async execute({ id, actor, photos }: Payload): Promise<Response> {
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

      const owned = await this.storages.allUploadedBy(
        photos.map((photo) => photo.storageId),
        actor.id,
        IMAGE_MIMETYPES,
      )

      if (!owned)
        return left(
          ListingRefusal.http({ code: 'STORAGE_NOT_FOUND', field: 'photos' }),
        )

      const attached = listing.attachPhotos(
        photos.map((photo) => ({
          id: this.ids.next(),
          environment: photo.environment,
          storageId: photo.storageId,
        })),
      )

      if (attached.isLeft()) return left(ListingRefusal.http(attached.value))

      const saved = await this.listings.save(listing)

      if (saved.isLeft()) return left(this.failure(saved.value))

      const urls = await ListingPhotoUrls.sign([saved.value], this.storage)

      return right(ListingPresenter.show(saved.value, urls))
    } catch (error) {
      return left(this.failure(error))
    }
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[owner/listing-photos > create][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.OWNER_LISTING_PHOTO_CREATE_ERROR'),
      'OWNER_LISTING_PHOTO_CREATE_ERROR',
    )
  }
}
