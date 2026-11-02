import type { StorefrontListingShowResponse } from '@aporta/shared'

import { WireDate } from '#core/response'
import type { ListingRecord } from '#repositories/listing/listing.repository'

/** The listing without its photos: the part of the public shape the owner's shape repeats. */
export type ListingFields = Omit<StorefrontListingShowResponse, 'photos'>

/**
 * The fields of a listing that the visitor and its owner read the same way
 * (`_standards/architecture.md` §10), field by field, by allowlist. The photos are left out
 * because they differ: the visitor gets the signed address, the owner gets it with the key of the
 * file as well. Left out for both is what belongs to the database: `deletedAt`,
 * `neighborhoodId`, `ownerId` and the owner's `verifiedAt` instant (the reader gets the fact,
 * `verified`, not when it was confirmed).
 *
 * It sits at the root of `features/` for the same reason as `_shared.profile.presenter.ts`: two
 * modules answer this shape, and a feature does not import another one.
 */
export default class ListingSharedPresenter {
  static fields(record: ListingRecord): ListingFields {
    const listing = record.listing.snapshot()

    return {
      id: listing.id,
      slug: listing.slug,
      type: listing.type,
      title: listing.title,
      description: listing.description,
      neighborhood: {
        slug: record.neighborhood.slug,
        name: record.neighborhood.name,
      },
      address: listing.address,
      price: { monthly: listing.priceMonthly, daily: listing.priceDaily },
      costs: {
        water: listing.costs.water,
        electricity: listing.costs.electricity,
        internet: listing.costs.internet,
      },
      periods: [...listing.periods],
      minimumStayMonths: listing.minimumStayMonths,
      availableFrom: listing.availableFrom,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      furnished: listing.furnished,
      rules: [...listing.rules],
      owner: {
        name: listing.owner.name,
        verified: listing.owner.verifiedAt !== null,
        whatsapp: listing.owner.whatsapp,
        // The last time the ad was touched: a stale one is an already-rented property or a scam.
        updatedAt: WireDate.day(record.updatedAt),
      },
      lat: listing.lat,
      lng: listing.lng,
      createdAt: WireDate.iso(record.createdAt),
      updatedAt: WireDate.iso(record.updatedAt),
    }
  }
}
