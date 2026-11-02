import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@aporta/shared'

import Translation from '#core/translation'
import type { IdentifierPayload } from '#core/validator'
import HTTPException from '#exceptions/http.exception'
import AdministratorListingRefusal from '#features/administrator/_shared.listing-refusal'
import ListingRepository from '#repositories/listing/listing.repository'
import ClockContract from '#services/clock/clock.contract'

type Payload = IdentifierPayload
type Response = Either<HTTPException, null>

/**
 * Takes any ad off the air on the staff's say. The transition (`ARCHIVED` and into the trash, in
 * one step) is the entity's, the same one the owner's archive uses. The ad is read with the trash
 * included so that archiving twice is the honest `409`, and not a `404` that says the ad does not
 * exist.
 */
@inject()
export default class AdministratorListingArchiveUseCase {
  constructor(
    private readonly listings: ListingRepository,
    private readonly clock: ClockContract,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const listing = await this.listings.findAnyById(id)

      if (!listing)
        return left(
          HTTPException.NotFound(
            Translation.t('errors.LISTING_NOT_FOUND'),
            'LISTING_NOT_FOUND',
          ),
        )

      const archived = listing.archive(this.clock.now())

      if (archived.isLeft())
        return left(AdministratorListingRefusal.http(archived.value))

      const saved = await this.listings.save(listing)

      if (saved.isLeft()) return left(this.failure(saved.value))

      return right(null)
    } catch (error) {
      return left(this.failure(error))
    }
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[administrator/listings > archive][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.ADMINISTRATOR_LISTING_ARCHIVE_ERROR'),
      'ADMINISTRATOR_LISTING_ARCHIVE_ERROR',
    )
  }
}
