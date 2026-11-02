import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Either,
  type StorefrontListingPaginateResponse,
} from '@aporta/shared'

import { PAGINATION } from '#core/response'
import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import { recentFirst } from '#features/_shared.sort'
import ListingPresenter from '#features/storefront/listings/listings.presenter'
import ListingRepository from '#repositories/listing/listing.repository'
import type { StorefrontListingPaginatePayload } from '#validators/storefront/listings.validator'

type Payload = StorefrontListingPaginatePayload
type Response = Either<HTTPException, StorefrontListingPaginateResponse>

/**
 * The public listing catalog: only `PUBLISHED` and outside the trash
 * (`ListingRepository.paginatePublished`), filtered by type, neighborhood, period and price.
 */
@inject()
export default class StorefrontListingPaginateUseCase {
  constructor(private readonly listings: ListingRepository) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      // `recentFirst` and not `sortOrder`: in a catalog of ads what matters is the latest
      // publication, not the first, and an alphabetical default would bury a new ad.
      const [sort, direction] = recentFirst(payload)

      const page = await this.listings.paginatePublished({
        page: payload.page ?? PAGINATION.PAGE,
        perPage: payload.perPage ?? PAGINATION.PER_PAGE,
        search: payload.search,
        type: payload.type,
        neighborhood: payload.neighborhood,
        period: payload.period,
        minPrice: payload.minPrice,
        maxPrice: payload.maxPrice,
        sort,
        direction,
      })

      return right({
        meta: page.meta,
        data: page.data.map((record) => ListingPresenter.show(record)),
      })
    } catch (error) {
      logger.error({ err: error }, '[storefront/listings > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.STOREFRONT_LISTING_PAGINATE_ERROR'),
          'STOREFRONT_LISTING_PAGINATE_ERROR',
        ),
      )
    }
  }
}
