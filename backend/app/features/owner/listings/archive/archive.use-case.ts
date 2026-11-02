import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@aporta/shared'

import Translation from '#core/translation'
import type { IdentifierPayload } from '#core/validator'
import HTTPException from '#exceptions/http.exception'
import ListingRefusal from '#features/owner/_shared.listing-refusal'
import ListingRepository from '#repositories/listing/listing.repository'
import ClockContract from '#services/clock/clock.contract'

type Payload = IdentifierPayload
type Response = Either<HTTPException, null>

/**
 * Takes the owner's ad off the air. Who may was decided by `ListingPolicy` in the controller; the
 * transition (`ARCHIVED` and into the trash, together) belongs to the entity, and the instant to
 * the clock, so a unit spec can pin it.
 */
@inject()
export default class OwnerListingArchiveUseCase {
  constructor(
    private readonly listings: ListingRepository,
    private readonly clock: ClockContract,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const listing = await this.listings.findById(id)

      if (!listing)
        return left(
          HTTPException.NotFound(
            Translation.t('errors.LISTING_NOT_FOUND'),
            'LISTING_NOT_FOUND',
          ),
        )

      const archived = listing.archive(this.clock.now())

      if (archived.isLeft()) return left(ListingRefusal.http(archived.value))

      const saved = await this.listings.save(listing)

      if (saved.isLeft()) return left(this.failure(saved.value))

      return right(null)
    } catch (error) {
      return left(this.failure(error))
    }
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[owner/listings > archive][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.OWNER_LISTING_ARCHIVE_ERROR'),
      'OWNER_LISTING_ARCHIVE_ERROR',
    )
  }
}
