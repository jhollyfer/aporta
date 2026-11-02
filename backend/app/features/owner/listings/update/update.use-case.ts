import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Either,
  type Merge,
  type OwnerListingShowResponse,
} from '@aporta/shared'

import Translation from '#core/translation'
import Neighborhood from '#domain/neighborhood/neighborhood.entity'
import HTTPException from '#exceptions/http.exception'
import ListingPhotoUrls from '#features/_shared.listing-photo-urls'
import ListingInput from '#features/owner/_shared.listing-input'
import ListingRefusal from '#features/owner/_shared.listing-refusal'
import ListingPresenter from '#features/owner/_shared.listing.presenter'
import ListingRepository from '#repositories/listing/listing.repository'
import NeighborhoodRepository from '#repositories/neighborhood/neighborhood.repository'
import StorageContract from '#services/storage/storage.contract'
import type { OwnerListingUpdatePayload } from '#validators/owner/listings.validator'

type Payload = Merge<OwnerListingUpdatePayload, { readonly id: string }>
type Response = Either<HTTPException, OwnerListingShowResponse>

/**
 * Edits an ad. Who may was decided by `ListingPolicy` in the controller; this reads the ad again
 * (the second read the standard accepts), resolves the new neighborhood when one was sent, lets
 * the entity apply the change and check its invariants, and writes. The status never moves here:
 * the entity's `update` has no verb for it.
 */
@inject()
export default class OwnerListingUpdateUseCase {
  constructor(
    private readonly listings: ListingRepository,
    private readonly neighborhoods: NeighborhoodRepository,
    private readonly storage: StorageContract,
  ) {}

  async execute({ id, ...payload }: Payload): Promise<Response> {
    try {
      const listing = await this.listings.findById(id)

      // The policy just read it; vanishing in between is the same `404` as never having been.
      if (!listing)
        return left(
          HTTPException.NotFound(
            Translation.t('errors.LISTING_NOT_FOUND'),
            'LISTING_NOT_FOUND',
          ),
        )

      let neighborhood: Neighborhood | null = null

      if (payload.neighborhood) {
        neighborhood = await this.neighborhoods.findBySlug(payload.neighborhood)

        if (!neighborhood)
          return left(
            ListingRefusal.http({
              code: 'NEIGHBORHOOD_NOT_FOUND',
              field: 'neighborhood',
            }),
          )
      }

      const updated = listing.update(
        ListingInput.changes(payload, listing.snapshot(), neighborhood),
      )

      if (updated.isLeft()) return left(ListingRefusal.http(updated.value))

      const saved = await this.listings.save(listing)

      // The slug is not in the change, so the `UNIQUE` index has nothing to refuse: any failure
      // here, a conflict included, is unexpected.
      if (saved.isLeft()) return left(this.failure(saved.value))

      const urls = await ListingPhotoUrls.sign([saved.value], this.storage)

      return right(ListingPresenter.show(saved.value, urls))
    } catch (error) {
      return left(this.failure(error))
    }
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[owner/listings > update][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.OWNER_LISTING_UPDATE_ERROR'),
      'OWNER_LISTING_UPDATE_ERROR',
    )
  }
}
