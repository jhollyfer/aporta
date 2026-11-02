import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Either,
  type StorefrontListingShowResponse,
} from '@aporta/shared'

import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import ListingPhotoUrls from '#features/_shared.listing-photo-urls'
import ListingPresenter from '#features/storefront/listings/listings.presenter'
import ListingRepository from '#repositories/listing/listing.repository'
import StorageContract from '#services/storage/storage.contract'
import type { StorefrontListingShowPayload } from '#validators/storefront/listings.validator'

type Payload = StorefrontListingShowPayload
type Response = Either<HTTPException, StorefrontListingShowResponse>

/**
 * The ad read by `slug`, the public address. Draft, pending, archived and nonexistent answer the
 * same `404`, and never `403`: the visitor cannot tell "exists and you cannot see it" from "does
 * not exist", so the storefront does not confirm an ad that is not on the air.
 */
@inject()
export default class StorefrontListingShowUseCase {
  constructor(
    private readonly listings: ListingRepository,
    private readonly storage: StorageContract,
  ) {}

  async execute({ slug }: Payload): Promise<Response> {
    try {
      const record = await this.listings.findPublishedRecordBySlug(slug)

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
      logger.error({ err: error }, '[storefront/listings > show][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.STOREFRONT_LISTING_SHOW_ERROR'),
          'STOREFRONT_LISTING_SHOW_ERROR',
        ),
      )
    }
  }
}
