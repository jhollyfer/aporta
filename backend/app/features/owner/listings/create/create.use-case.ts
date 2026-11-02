import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Actor,
  type Either,
  type Merge,
  type OwnerListingShowResponse,
} from '@aporta/shared'

import { WireDate } from '#core/response'
import Translation from '#core/translation'
import Listing from '#domain/listing/listing.entity'
import Slug from '#domain/shared/slug.value-object'
import HTTPException from '#exceptions/http.exception'
import ListingPhotoUrls from '#features/_shared.listing-photo-urls'
import ListingInput from '#features/owner/_shared.listing-input'
import ListingRefusal from '#features/owner/_shared.listing-refusal'
import ListingPresenter from '#features/owner/_shared.listing.presenter'
import ListingRepository from '#repositories/listing/listing.repository'
import NeighborhoodRepository from '#repositories/neighborhood/neighborhood.repository'
import ClockContract from '#services/clock/clock.contract'
import IdGeneratorContract from '#services/id-generator/id-generator.contract'
import StorageContract from '#services/storage/storage.contract'
import type { OwnerListingCreatePayload } from '#validators/owner/listings.validator'

/** The session account: the owner is whoever is signed in, never a field of the body. */
type Payload = Merge<OwnerListingCreatePayload, { readonly actor: Actor }>
type Response = Either<HTTPException, OwnerListingShowResponse>

/**
 * How many times a taken `slug` is retried with a new suffix before the write is given up as a
 * failure. The suffix is the last eight hex digits of a fresh uuid, so a second collision in a row is not
 * chance, it is something wrong, and a loop with no end would hide it.
 */
const SLUG_ATTEMPTS = 3

/**
 * Creates the ad of the signed-in owner. Born `PENDING`: the entity is created `DRAFT` and handed
 * to the review in the same step (`Listing.submit`), because an ad the owner finished typing has
 * nowhere to wait but the review queue, and nothing here can publish it.
 *
 * The owner is the `actor`, the pin is the center of the chosen neighborhood, and the contact the
 * visitor sees is the one in the body. The neighborhood is checked through the repository (a
 * `slug` that does not exist is a `422` on the field, not a foreign-key `500`). The `slug` is
 * generated here from the title plus a piece of a fresh id; if the `UNIQUE` index refuses it
 * because another ad took it between the generation and the `INSERT`, the write is retried with
 * another suffix.
 */
@inject()
export default class OwnerListingCreateUseCase {
  constructor(
    private readonly listings: ListingRepository,
    private readonly neighborhoods: NeighborhoodRepository,
    private readonly storage: StorageContract,
    private readonly ids: IdGeneratorContract,
    private readonly clock: ClockContract,
  ) {}

  async execute({ actor, ...payload }: Payload): Promise<Response> {
    try {
      const neighborhood = await this.neighborhoods.findBySlug(
        payload.neighborhood,
      )

      if (!neighborhood)
        return left(
          ListingRefusal.http({
            code: 'NEIGHBORHOOD_NOT_FOUND',
            field: 'neighborhood',
          }),
        )

      const center = neighborhood.snapshot()
      const id = this.ids.next()

      return await this.save(SLUG_ATTEMPTS, payload.title, (slug) =>
        Listing.create({
          id,
          slug,
          ownerId: actor.id,
          type: payload.type,
          title: payload.title,
          description: payload.description,
          neighborhoodId: center.id,
          address: payload.address,
          priceMonthly: payload.monthly,
          priceDaily: payload.daily ?? null,
          costs: {
            water: payload.water,
            electricity: payload.electricity,
            internet: payload.internet,
          },
          periods: payload.periods,
          minimumStayMonths: payload.minimumStayMonths,
          // The ad is for rent from the day it is written; the form has no date yet.
          availableFrom: WireDate.day(this.clock.now()),
          bedrooms: payload.bedrooms ?? 1,
          bathrooms: payload.bathrooms ?? 1,
          furnished: payload.furnished,
          rules: ListingInput.rules(payload.rules ?? ''),
          owner: {
            name: payload.ownerName,
            whatsapp: payload.whatsapp,
            verifiedAt: null,
          },
          lat: center.lat,
          lng: center.lng,
        }),
      )
    } catch (error) {
      return left(this.failure(error))
    }
  }

  /** One attempt, and another with a new `slug` while the index keeps refusing it. */
  private async save(
    attempts: number,
    title: string,
    build: (slug: string) => ReturnType<typeof Listing.create>,
  ): Promise<Response> {
    const slug = Slug.of(title, this.ids.next().slice(-8)).value
    const created = build(slug)

    if (created.isLeft()) return left(ListingRefusal.http(created.value))

    const saved = await this.listings.save(created.value.submit())

    if (saved.isRight()) {
      const urls = await ListingPhotoUrls.sign([saved.value], this.storage)

      return right(ListingPresenter.show(saved.value, urls))
    }

    if (saved.value.code === 'UNIQUE_CONFLICT' && attempts > 1)
      return this.save(attempts - 1, title, build)

    if (saved.value.code === 'UNIQUE_CONFLICT')
      return left(this.failure(new Error('slug kept colliding')))

    return left(this.failure(saved.value.cause))
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[owner/listings > create][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.OWNER_LISTING_CREATE_ERROR'),
      'OWNER_LISTING_CREATE_ERROR',
    )
  }
}
