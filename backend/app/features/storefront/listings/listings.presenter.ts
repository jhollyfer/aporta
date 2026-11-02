import type { StorefrontListingShowResponse } from '@aporta/shared'

import { WireDate } from '#core/response'
import type { ListingRecord } from '#repositories/listing/listing.repository'

/**
 * The listing as the visitor reads it (`_standards/architecture.md` §10), field by field, by
 * allowlist. Left out is what belongs to the panel or to the database: `status` (only the
 * published one gets here), `deletedAt`, `neighborhoodId`, and the owner's `verifiedAt` instant
 * (the visitor gets the fact, `verified`, not when it was confirmed).
 */
export default class ListingPresenter {
  static show(record: ListingRecord): StorefrontListingShowResponse {
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
      // No file yet: `url: null` is the contract for "no photo", and the frontend draws the room.
      photos: listing.photos.map((photo) => ({
        id: photo.id,
        environment: photo.environment,
        url: null,
      })),
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
