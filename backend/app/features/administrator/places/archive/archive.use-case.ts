import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@aporta/shared'

import Translation from '#core/translation'
import type { IdentifierPayload } from '#core/validator'
import HTTPException from '#exceptions/http.exception'
import AdministratorPlaceRefusal from '#features/administrator/_shared.place-refusal'
import PlaceRepository from '#repositories/place/place.repository'
import ClockContract from '#services/clock/clock.contract'

type Payload = IdentifierPayload
type Response = Either<HTTPException, null>

/**
 * Takes a place out of the guide on the staff's say. The transition is the entity's. The place is
 * read with the trash included so that archiving twice is the honest `409`, and not a `404` that
 * says the place does not exist.
 */
@inject()
export default class AdministratorPlaceArchiveUseCase {
  constructor(
    private readonly places: PlaceRepository,
    private readonly clock: ClockContract,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const record = await this.places.findAnyRecordById(id)

      if (!record) return left(AdministratorPlaceRefusal.notFound())

      const archived = record.place.archive(this.clock.now())

      if (archived.isLeft())
        return left(AdministratorPlaceRefusal.http(archived.value))

      const saved = await this.places.save(record.place)

      if (saved.isLeft()) return left(this.failure(saved.value.cause))

      return right(null)
    } catch (error) {
      return left(this.failure(error))
    }
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[administrator/places > archive][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.ADMINISTRATOR_PLACE_ARCHIVE_ERROR'),
      'ADMINISTRATOR_PLACE_ARCHIVE_ERROR',
    )
  }
}
