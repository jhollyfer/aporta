import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@aporta/shared'

import Translation from '#core/translation'
import type { IdentifierPayload } from '#core/validator'
import HTTPException from '#exceptions/http.exception'
import AdministratorPlaceRefusal from '#features/administrator/_shared.place-refusal'
import PlaceRepository from '#repositories/place/place.repository'

type Payload = IdentifierPayload
type Response = Either<HTTPException, null>

/**
 * Deletes a place for good, on the administrator's say (the route is `ADMINISTRATOR` only; the
 * moderator archives but does not erase). Only a place already in the trash may go
 * (`Place.ensureErasable`, `409 PLACE_NOT_ARCHIVED`), so a place on the guide is never erased by a
 * slip. Nothing points at a place, so there are no reports or files to look after.
 */
@inject()
export default class AdministratorPlaceDeleteUseCase {
  constructor(private readonly places: PlaceRepository) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const record = await this.places.findAnyRecordById(id)

      if (!record) return left(AdministratorPlaceRefusal.notFound())

      const erasable = record.place.ensureErasable()

      if (erasable.isLeft())
        return left(AdministratorPlaceRefusal.http(erasable.value))

      await this.places.delete(record.place)

      return right(null)
    } catch (error) {
      logger.error({ err: error }, '[administrator/places > delete][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.ADMINISTRATOR_PLACE_DELETE_ERROR'),
          'ADMINISTRATOR_PLACE_DELETE_ERROR',
        ),
      )
    }
  }
}
