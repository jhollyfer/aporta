import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorPlaceShowResponse,
  type Either,
  type Merge,
} from '@aporta/shared'

import Translation from '#core/translation'
import type { IdentifierPayload } from '#core/validator'
import HTTPException from '#exceptions/http.exception'
import AdministratorPlaceRefusal from '#features/administrator/_shared.place-refusal'
import AdministratorPlacePresenter from '#features/administrator/places/places.presenter'
import NeighborhoodRepository from '#repositories/neighborhood/neighborhood.repository'
import PlaceRepository from '#repositories/place/place.repository'
import type { AdministratorPlaceWritePayload } from '#validators/administrator/places.validator'

type Payload = Merge<AdministratorPlaceWritePayload, IdentifierPayload>
type Response = Either<HTTPException, AdministratorPlaceShowResponse>

/**
 * Replaces what the staff edits in a place. The place is read with the trash included: fixing a
 * typo before bringing an archived place back is legitimate, and the edit does not touch the
 * trash. Moving a place out of `EVENT` without dropping its date is the entity's `422`.
 */
@inject()
export default class AdministratorPlaceUpdateUseCase {
  constructor(
    private readonly places: PlaceRepository,
    private readonly neighborhoods: NeighborhoodRepository,
  ) {}

  async execute({ id, ...payload }: Payload): Promise<Response> {
    try {
      const record = await this.places.findAnyRecordById(id)

      if (!record) return left(AdministratorPlaceRefusal.notFound())

      const neighborhood = await this.neighborhoods.findBySlug(
        payload.neighborhood,
      )

      if (!neighborhood)
        return left(
          AdministratorPlaceRefusal.http({
            code: 'NEIGHBORHOOD_NOT_FOUND',
            field: 'neighborhood',
          }),
        )

      const changed = record.place.change({
        category: payload.category,
        name: payload.name,
        description: payload.description,
        neighborhoodId: neighborhood.id,
        address: payload.address,
        hours: payload.hours,
        whatsapp: payload.whatsapp ?? null,
        date: payload.date ?? null,
      })

      if (changed.isLeft())
        return left(AdministratorPlaceRefusal.http(changed.value))

      const saved = await this.places.save(record.place)

      if (saved.isLeft()) return left(this.failure(saved.value.cause))

      return right(AdministratorPlacePresenter.show(saved.value))
    } catch (error) {
      return left(this.failure(error))
    }
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[administrator/places > update][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.ADMINISTRATOR_PLACE_UPDATE_ERROR'),
      'ADMINISTRATOR_PLACE_UPDATE_ERROR',
    )
  }
}
