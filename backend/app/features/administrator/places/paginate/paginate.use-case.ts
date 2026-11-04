import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorPlacePaginateResponse,
  type Either,
} from '@aporta/shared'

import { PAGINATION } from '#core/response'
import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import { sortOrder } from '#features/_shared.sort'
import AdministratorPlacePresenter from '#features/administrator/places/places.presenter'
import PlaceRepository from '#repositories/place/place.repository'
import type { AdministratorPlacePaginatePayload } from '#validators/administrator/places.validator'

type Payload = AdministratorPlacePaginatePayload
type Response = Either<HTTPException, AdministratorPlacePaginateResponse>

/**
 * The staff's list of the guide: alphabetical like the public one, but with the trash slice
 * (`trashed`) the storefront never has. Absent, it is the live places; `only` is the archive
 * screen.
 */
@inject()
export default class AdministratorPlacePaginateUseCase {
  constructor(private readonly places: PlaceRepository) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const [sort, direction] = sortOrder(payload, 'name')

      const page = await this.places.paginate({
        page: payload.page ?? PAGINATION.PAGE,
        perPage: payload.perPage ?? PAGINATION.PER_PAGE,
        search: payload.search,
        category: payload.category,
        trashed: payload.trashed,
        sort,
        direction,
      })

      return right({
        meta: page.meta,
        data: page.data.map((record) =>
          AdministratorPlacePresenter.show(record),
        ),
      })
    } catch (error) {
      logger.error({ err: error }, '[administrator/places > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.ADMINISTRATOR_PLACE_PAGINATE_ERROR'),
          'ADMINISTRATOR_PLACE_PAGINATE_ERROR',
        ),
      )
    }
  }
}
