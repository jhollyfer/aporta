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

/** Brings an archived place back to the guide; restoring one that is not archived is a `409`. */
@inject()
export default class AdministratorPlaceUnarchiveUseCase {
  constructor(private readonly places: PlaceRepository) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const record = await this.places.findAnyRecordById(id)

      if (!record) return left(AdministratorPlaceRefusal.notFound())

      const restored = record.place.unarchive()

      if (restored.isLeft())
        return left(AdministratorPlaceRefusal.http(restored.value))

      const saved = await this.places.save(record.place)

      if (saved.isLeft()) return left(this.failure(saved.value.cause))

      return right(null)
    } catch (error) {
      return left(this.failure(error))
    }
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[administrator/places > unarchive][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.ADMINISTRATOR_PLACE_UNARCHIVE_ERROR'),
      'ADMINISTRATOR_PLACE_UNARCHIVE_ERROR',
    )
  }
}
