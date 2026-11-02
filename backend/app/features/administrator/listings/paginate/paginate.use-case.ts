import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  LISTING_STATUS,
  SORT_DIRECTION,
  left,
  right,
  type AdministratorListingPaginateResponse,
  type Either,
  type SortDirection,
} from '@aporta/shared'

import { PAGINATION } from '#core/response'
import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import ListingPhotoUrls from '#features/_shared.listing-photo-urls'
import AdministratorListingPresenter from '#features/administrator/listings/listings.presenter'
import ListingRepository from '#repositories/listing/listing.repository'
import StorageContract from '#services/storage/storage.contract'
import type { AdministratorListingPaginatePayload } from '#validators/administrator/listings.validator'

type Payload = AdministratorListingPaginatePayload
type Response = Either<HTTPException, AdministratorListingPaginateResponse>

/**
 * The staff's list of ads. The default order is the point of the screen: the review queue
 * (`PENDING`) is read **oldest first**, since the ad that has waited longest is the one someone is
 * waiting on, and every other cut reads newest first, like the owner's list. An explicit `sort` or
 * `direction` wins over both.
 */
@inject()
export default class AdministratorListingPaginateUseCase {
  constructor(
    private readonly listings: ListingRepository,
    private readonly storage: StorageContract,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const page = await this.listings.paginateForReview({
        page: payload.page ?? PAGINATION.PAGE,
        perPage: payload.perPage ?? PAGINATION.PER_PAGE,
        search: payload.search,
        status: payload.status,
        sort: payload.sort ?? 'createdAt',
        direction: this.direction(payload),
      })
      const urls = await ListingPhotoUrls.sign(page.data, this.storage)

      return right({
        meta: page.meta,
        data: page.data.map((record) =>
          AdministratorListingPresenter.show(record, urls),
        ),
      })
    } catch (error) {
      logger.error({ err: error }, '[administrator/listings > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.ADMINISTRATOR_LISTING_PAGINATE_ERROR'),
          'ADMINISTRATOR_LISTING_PAGINATE_ERROR',
        ),
      )
    }
  }

  private direction(payload: Payload): SortDirection {
    if (payload.direction) return payload.direction
    if (payload.status === LISTING_STATUS.PENDING) return SORT_DIRECTION.ASC

    return SORT_DIRECTION.DESC
  }
}
