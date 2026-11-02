import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Either,
  type OwnerListingShowResponse,
} from '@aporta/shared'

import Translation from '#core/translation'
import type { IdentifierPayload } from '#core/validator'
import HTTPException from '#exceptions/http.exception'
import ListingPhotoUrls from '#features/_shared.listing-photo-urls'
import ListingPresenter from '#features/owner/_shared.listing.presenter'
import ListingRepository from '#repositories/listing/listing.repository'
import StorageContract from '#services/storage/storage.contract'

type Payload = IdentifierPayload
type Response = Either<HTTPException, OwnerListingShowResponse>

/**
 * The owner's ad by id. Who may read it was decided by `ListingPolicy` in the controller; this
 * reads it again with its neighborhood and files (the second read the standard accepts) and
 * presents it. An ad that vanished between the two reads is the same `404`.
 */
@inject()
export default class OwnerListingShowUseCase {
  constructor(
    private readonly listings: ListingRepository,
    private readonly storage: StorageContract,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const record = await this.listings.findRecordById(id)

      if (!record)
        return left(
          HTTPException.NotFound(
            Translation.t('errors.LISTING_NOT_FOUND'),
            'LISTING_NOT_FOUND',
          ),
        )

      const urls = await ListingPhotoUrls.sign([record], this.storage)

      return right(ListingPresenter.show(record, urls))
    } catch (error) {
      logger.error({ err: error }, '[owner/listings > show][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.OWNER_LISTING_SHOW_ERROR'),
          'OWNER_LISTING_SHOW_ERROR',
        ),
      )
    }
  }
}
