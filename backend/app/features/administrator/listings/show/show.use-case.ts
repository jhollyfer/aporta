import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorListingShowResponse,
  type Either,
} from '@aporta/shared'

import Translation from '#core/translation'
import type { IdentifierPayload } from '#core/validator'
import HTTPException from '#exceptions/http.exception'
import ListingPhotoUrls from '#features/_shared.listing-photo-urls'
import AdministratorListingPresenter from '#features/administrator/listings/listings.presenter'
import ListingRepository from '#repositories/listing/listing.repository'
import StorageContract from '#services/storage/storage.contract'

type Payload = IdentifierPayload
type Response = Either<HTTPException, AdministratorListingShowResponse>

/**
 * The ad for the staff, whatever its state. There is no policy: the route group asks for the staff
 * role, and the staff reads every ad by definition. An id that is not an ad is the `404`.
 */
@inject()
export default class AdministratorListingShowUseCase {
  constructor(
    private readonly listings: ListingRepository,
    private readonly storage: StorageContract,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const record = await this.listings.findAnyRecordById(id)

      if (!record)
        return left(
          HTTPException.NotFound(
            Translation.t('errors.LISTING_NOT_FOUND'),
            'LISTING_NOT_FOUND',
          ),
        )

      const urls = await ListingPhotoUrls.sign([record], this.storage)

      return right(AdministratorListingPresenter.show(record, urls))
    } catch (error) {
      logger.error({ err: error }, '[administrator/listings > show][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.ADMINISTRATOR_LISTING_SHOW_ERROR'),
          'ADMINISTRATOR_LISTING_SHOW_ERROR',
        ),
      )
    }
  }
}
