import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorPlaceShowResponse,
  type Either,
} from '@aporta/shared'

import Translation from '#core/translation'
import Place from '#domain/place/place.entity'
import HTTPException from '#exceptions/http.exception'
import AdministratorPlaceRefusal from '#features/administrator/_shared.place-refusal'
import AdministratorPlacePresenter from '#features/administrator/places/places.presenter'
import NeighborhoodRepository from '#repositories/neighborhood/neighborhood.repository'
import PlaceRepository from '#repositories/place/place.repository'
import IdGeneratorContract from '#services/id-generator/id-generator.contract'
import type { AdministratorPlaceWritePayload } from '#validators/administrator/places.validator'

type Payload = AdministratorPlaceWritePayload
type Response = Either<HTTPException, AdministratorPlaceShowResponse>

/**
 * Adds a place to the guide. The neighborhood arrives by `slug` and is checked through its
 * repository (a `slug` that does not exist is a `422` on the field, not a foreign-key `500`); the
 * invariants of the place (an event has a day, the rest do not) are the entity's.
 */
@inject()
export default class AdministratorPlaceCreateUseCase {
  constructor(
    private readonly places: PlaceRepository,
    private readonly neighborhoods: NeighborhoodRepository,
    private readonly ids: IdGeneratorContract,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
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

      const created = Place.create({
        id: this.ids.next(),
        category: payload.category,
        name: payload.name,
        description: payload.description,
        neighborhoodId: neighborhood.id,
        address: payload.address,
        hours: payload.hours,
        whatsapp: payload.whatsapp ?? null,
        date: payload.date ?? null,
      })

      if (created.isLeft())
        return left(AdministratorPlaceRefusal.http(created.value))

      const saved = await this.places.save(created.value)

      if (saved.isLeft()) return left(this.failure(saved.value.cause))

      return right(AdministratorPlacePresenter.show(saved.value))
    } catch (error) {
      return left(this.failure(error))
    }
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[administrator/places > create][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.ADMINISTRATOR_PLACE_CREATE_ERROR'),
      'ADMINISTRATOR_PLACE_CREATE_ERROR',
    )
  }
}
