import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Either,
  type StorefrontNeighborhoodPaginateResponse,
} from '@aporta/shared'

import { PAGINATION } from '#core/response'
import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import { sortOrder } from '#features/_shared.sort'
import NeighborhoodPresenter from '#features/storefront/neighborhoods/neighborhoods.presenter'
import NeighborhoodRepository from '#repositories/neighborhood/neighborhood.repository'
import type { StorefrontNeighborhoodPaginatePayload } from '#validators/storefront/neighborhoods.validator'

type Payload = StorefrontNeighborhoodPaginatePayload
type Response = Either<HTTPException, StorefrontNeighborhoodPaginateResponse>

/** The public neighborhood list, in alphabetical order: it feeds a filter, not a feed. */
@inject()
export default class StorefrontNeighborhoodPaginateUseCase {
  constructor(private readonly neighborhoods: NeighborhoodRepository) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const [sort, direction] = sortOrder(payload, 'name')

      const page = await this.neighborhoods.paginate({
        page: payload.page ?? PAGINATION.PAGE,
        perPage: payload.perPage ?? PAGINATION.PER_PAGE,
        search: payload.search,
        sort,
        direction,
      })

      return right({
        meta: page.meta,
        data: page.data.map((neighborhood) =>
          NeighborhoodPresenter.show(neighborhood),
        ),
      })
    } catch (error) {
      logger.error(
        { err: error },
        '[storefront/neighborhoods > paginate][error]',
      )

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.STOREFRONT_NEIGHBORHOOD_PAGINATE_ERROR'),
          'STOREFRONT_NEIGHBORHOOD_PAGINATE_ERROR',
        ),
      )
    }
  }
}
