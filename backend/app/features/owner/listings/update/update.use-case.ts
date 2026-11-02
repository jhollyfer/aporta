import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Either,
  type Merge,
  type OwnerListingShowResponse,
} from '@aporta/shared'

import type RepositoryFailure from '#core/repository-failure'
import Translation from '#core/translation'
import type { UniqueConflict } from '#core/unique-conflict'
import type { ListingProps } from '#domain/listing/listing.entity'
import Neighborhood from '#domain/neighborhood/neighborhood.entity'
import HTTPException from '#exceptions/http.exception'
import ListingPhotoUrls from '#features/_shared.listing-photo-urls'
import ListingInput from '#features/owner/_shared.listing-input'
import ListingRefusal from '#features/owner/_shared.listing-refusal'
import ListingPresenter from '#features/owner/_shared.listing.presenter'
import ListingRepository from '#repositories/listing/listing.repository'
import NeighborhoodRepository from '#repositories/neighborhood/neighborhood.repository'
import UserRepository from '#repositories/user/user.repository'
import StorageContract from '#services/storage/storage.contract'
import type { OwnerListingUpdatePayload } from '#validators/owner/listings.validator'

type Payload = Merge<OwnerListingUpdatePayload, { readonly id: string }>
type Response = Either<HTTPException, OwnerListingShowResponse>

/**
 * Edits an ad. Who may was decided by `ListingPolicy` in the controller; this reads the ad again
 * (the second read the standard accepts), resolves the new neighborhood when one was sent, lets
 * the entity apply the change and check its invariants, and writes. `update` itself has no verb for
 * the status: the only move is `submit`, which hands a `DRAFT` (an ad the staff sent back) to the
 * queue again and leaves every other status where it is.
 */
@inject()
export default class OwnerListingUpdateUseCase {
  constructor(
    private readonly listings: ListingRepository,
    private readonly neighborhoods: NeighborhoodRepository,
    private readonly users: UserRepository,
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

      const before = listing.snapshot()
      const updated = listing.update(
        ListingInput.changes(payload, before, neighborhood),
      )

      if (updated.isLeft()) return left(ListingRefusal.http(updated.value))

      // An ad the staff sent back returns to the queue by being edited: the owner has no other
      // button, and an edit is exactly the "I fixed it" the refusal asked for. A no-op elsewhere.
      listing.submit()

      // The seal is the account's, so a new contact on any of its ads takes the seal off the
      // account (`Listing.update` clears only the ad's own copy). Before the write on purpose: if
      // this step fails the ad stays as it was, and if the next one fails the owner lost a seal he
      // can have back, which is the safe side to fail on.
      const unsealed = await this.withdrawSeal(before, listing.snapshot())

      if (unsealed) return left(this.failure(unsealed))

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

  /**
   * Takes the account's "verified owner" seal off when the contact on the ad changed. The staff
   * confirmed a person behind a number; a new number is a new person until confirmed again. Nothing
   * to do for an ad with no account, whose own column `Listing.update` already cleared.
   */
  private async withdrawSeal(
    before: Readonly<ListingProps>,
    after: Readonly<ListingProps>,
  ): Promise<RepositoryFailure | UniqueConflict | null> {
    const contactChanged =
      before.owner.name !== after.owner.name ||
      before.owner.whatsapp !== after.owner.whatsapp

    if (!contactChanged || after.ownerId === null) return null

    const account = await this.users.findById(after.ownerId)
    if (!account || account.snapshot().verifiedAt === null) return null

    const saved = await this.users.save(account.unverify())

    if (saved.isLeft()) return saved.value

    return null
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[owner/listings > update][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.OWNER_LISTING_UPDATE_ERROR'),
      'OWNER_LISTING_UPDATE_ERROR',
    )
  }
}
