import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  LISTING_REVIEW_DECISION,
  left,
  right,
  type Actor,
  type AdministratorListingShowResponse,
  type Either,
  type Merge,
} from '@aporta/shared'

import Translation from '#core/translation'
import type { IdentifierPayload } from '#core/validator'
import type Listing from '#domain/listing/listing.entity'
import type { ListingReviewError } from '#domain/listing/listing.errors'
import HTTPException from '#exceptions/http.exception'
import ListingPhotoUrls from '#features/_shared.listing-photo-urls'
import AdministratorListingRefusal from '#features/administrator/_shared.listing-refusal'
import AdministratorListingPresenter from '#features/administrator/listings/listings.presenter'
import ListingRepository from '#repositories/listing/listing.repository'
import ClockContract from '#services/clock/clock.contract'
import StorageContract from '#services/storage/storage.contract'
import type { AdministratorListingReviewPayload } from '#validators/administrator/listings.validator'

type Payload = Merge<
  Merge<AdministratorListingReviewPayload, IdentifierPayload>,
  { readonly actor: Actor }
>
type Response = Either<HTTPException, AdministratorListingShowResponse>

/**
 * Decides an ad in the queue. The transitions and their invariants (only `PENDING`, a refusal
 * needs a reason of 3 to 500 characters) belong to the entity; the instant to the clock, so a unit
 * spec can pin it; the author is the `actor`, never a field of the body.
 *
 * The refusal without a `note` is not a validator error but an entity one: whether a reason is
 * required depends on the decision, which the two validator libraries do not express the same way.
 */
@inject()
export default class AdministratorListingReviewUseCase {
  constructor(
    private readonly listings: ListingRepository,
    private readonly storage: StorageContract,
    private readonly clock: ClockContract,
  ) {}

  async execute({ id, decision, note, actor }: Payload): Promise<Response> {
    try {
      const listing = await this.listings.findAnyById(id)

      if (!listing)
        return left(
          HTTPException.NotFound(
            Translation.t('errors.LISTING_NOT_FOUND'),
            'LISTING_NOT_FOUND',
          ),
        )

      const decided = this.decide(listing, decision, note ?? '', actor.id)

      if (decided.isLeft())
        return left(AdministratorListingRefusal.http(decided.value))

      const saved = await this.listings.save(listing)

      if (saved.isLeft()) return left(this.failure(saved.value))

      const urls = await ListingPhotoUrls.sign([saved.value], this.storage)

      return right(AdministratorListingPresenter.show(saved.value, urls))
    } catch (error) {
      return left(this.failure(error))
    }
  }

  private decide(
    listing: Listing,
    decision: Payload['decision'],
    note: string,
    by: string,
  ): Either<ListingReviewError, Listing> {
    const at = this.clock.now()

    if (decision === LISTING_REVIEW_DECISION.APPROVE)
      return listing.approve(by, at)

    return listing.refuse(note, by, at)
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[administrator/listings > review][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.ADMINISTRATOR_LISTING_REVIEW_ERROR'),
      'ADMINISTRATOR_LISTING_REVIEW_ERROR',
    )
  }
}
