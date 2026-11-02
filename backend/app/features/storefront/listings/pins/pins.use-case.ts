import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  LISTING_PINS_LIMIT,
  left,
  right,
  type Either,
  type StorefrontListingPinsResponse,
} from '@aporta/shared'

import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import MapWindow from '#features/_shared.map-window'
import ListingPresenter from '#features/storefront/listings/listings.presenter'
import ListingRepository from '#repositories/listing/listing.repository'
import type { StorefrontListingPinsPayload } from '#validators/storefront/listings.validator'

type Payload = StorefrontListingPinsPayload
type Response = Either<HTTPException, StorefrontListingPinsResponse>

/**
 * The points the map draws: the published ads inside the filters and the window, newest first, up
 * to `LISTING_PINS_LIMIT`. A separate read from the catalog on purpose: a pin needs no photo, no
 * owner and no page, so it is one narrow query with no signed URL (and the answer can be cached).
 * `meta.total` says how many match in all, so the screen can ask the visitor to zoom in when the
 * window holds more than it draws.
 */
@inject()
export default class StorefrontListingPinsUseCase {
  constructor(private readonly listings: ListingRepository) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const { total, pins } = await this.listings.findPublishedPins({
        limit: LISTING_PINS_LIMIT,
        search: payload.search,
        type: payload.type,
        neighborhood: payload.neighborhood,
        period: payload.period,
        minPrice: payload.minPrice,
        maxPrice: payload.maxPrice,
        bounds: MapWindow.of(payload),
      })

      return right({
        data: pins.map((pin) => ListingPresenter.pin(pin)),
        meta: { total, limit: LISTING_PINS_LIMIT },
      })
    } catch (error) {
      logger.error({ err: error }, '[storefront/listings > pins][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.STOREFRONT_LISTING_PINS_ERROR'),
          'STOREFRONT_LISTING_PINS_ERROR',
        ),
      )
    }
  }
}
