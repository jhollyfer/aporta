import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Either,
  type StorefrontPlacePaginateResponse,
} from '@aporta/shared'

import { PAGINATION } from '#core/response'
import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import { sortOrder } from '#features/_shared.sort'
import PlacePresenter from '#features/storefront/places/places.presenter'
import PlaceRepository from '#repositories/place/place.repository'
import type { StorefrontPlacePaginatePayload } from '#validators/storefront/places.validator'

type Payload = StorefrontPlacePaginatePayload
type Response = Either<HTTPException, StorefrontPlacePaginateResponse>

/** The public city guide, by tab, in alphabetical order: a guide is read by name, not by recency. */
@inject()
export default class StorefrontPlacePaginateUseCase {
  constructor(private readonly places: PlaceRepository) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const [sort, direction] = sortOrder(payload, 'name')

      const page = await this.places.paginate({
        page: payload.page ?? PAGINATION.PAGE,
        perPage: payload.perPage ?? PAGINATION.PER_PAGE,
        search: payload.search,
        category: payload.category,
        sort,
        direction,
      })

      return right({
        meta: page.meta,
        data: page.data.map((record) => PlacePresenter.show(record)),
      })
    } catch (error) {
      logger.error({ err: error }, '[storefront/places > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.STOREFRONT_PLACE_PAGINATE_ERROR'),
          'STOREFRONT_PLACE_PAGINATE_ERROR',
        ),
      )
    }
  }
}
