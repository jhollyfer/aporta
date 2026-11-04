import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Actor,
  type Either,
  type Merge,
  type OwnerListingPhotoCreateResponse,
} from '@aporta/shared'

import Translation from '#core/translation'
import Listing from '#domain/listing/listing.entity'
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
 * The question "are these mine and finished" is one repository call
 * (`StorageRepository.findUploadedBy`), asked **before** the write: `storage_id` is a foreign key,
 * and a file of another account is the hole this closes. A file that is not the actor's answers
 * like one that does not exist, so the response cannot be used to learn which uuids are files.
 * Whether each one is a JPEG/PNG/WebP up to 10 MB is `Listing.checkPhotoFile` (its own `422`:
 * the generic upload accepts more than a photo needs). The ceiling and the repeated file are the
 * entity's.
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

      const wanted = new Set(photos.map((photo) => photo.storageId))
      const sent = await this.storages.findUploadedBy([...wanted], actor.id)

      if (sent.length !== wanted.size)
        return left(
          ListingRefusal.http({ code: 'STORAGE_NOT_FOUND', field: 'photos' }),
        )

      // The files are the actor's own, so naming what is wrong with one confirms nothing.
      for (const file of sent) {
        const { mimetype, size } = file.snapshot()
        const fit = Listing.checkPhotoFile({ mimetype, size })

        if (fit.isLeft()) return left(ListingRefusal.http(fit.value))
      }

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
