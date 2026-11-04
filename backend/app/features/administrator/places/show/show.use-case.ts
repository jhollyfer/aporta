import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorPlaceShowResponse,
  type Either,
} from '@aporta/shared'

import Translation from '#core/translation'
import type { IdentifierPayload } from '#core/validator'
import HTTPException from '#exceptions/http.exception'
import AdministratorPlaceRefusal from '#features/administrator/_shared.place-refusal'
import AdministratorPlacePresenter from '#features/administrator/places/places.presenter'
import PlaceRepository from '#repositories/place/place.repository'

type Payload = IdentifierPayload
type Response = Either<HTTPException, AdministratorPlaceShowResponse>

/**
 * A guide place for the staff, archived or not. There is no policy: the route group asks for the
 * staff role, and the staff reads every place by definition.
 */
@inject()
export default class AdministratorPlaceShowUseCase {
  constructor(private readonly places: PlaceRepository) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const record = await this.places.findAnyRecordById(id)

      if (!record) return left(AdministratorPlaceRefusal.notFound())

      return right(AdministratorPlacePresenter.show(record))
    } catch (error) {
      logger.error({ err: error }, '[administrator/places > show][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.ADMINISTRATOR_PLACE_SHOW_ERROR'),
          'ADMINISTRATOR_PLACE_SHOW_ERROR',
        ),
      )
    }
  }
}
