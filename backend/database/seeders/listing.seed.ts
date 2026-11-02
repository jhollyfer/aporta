import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { LISTING_STATUS, PHOTO_ENVIRONMENT, type Listing } from '@aporta/shared'
import { DateTime } from 'luxon'

import { LISTINGS } from '#database/data/listings'
import NeighborhoodSeeder from '#database/seeders/neighborhood.seed'
import ListingModel from '#models/listing'
import ListingPhotoModel from '#models/listing-photo'
import Neighborhood from '#models/neighborhood'

/**
 * The twelve sample listings, all `PUBLISHED`. Development only (`static environment`): the
 * phones are fictional and the owners are generic names, and a production database must never be
 * born with ads that send a visitor to a number that is not real (`docs/TASKS.md` 7.10).
 *
 * Idempotent by `slug` (`updateOrCreate`, _doc-lib/lucid.md#seeders), and the photos by
 * `(listing, position)`, so the second run changes nothing and adds nothing. It runs the
 * neighborhood seeder first for the same reason that one explains.
 *
 * `owner.updatedAt` of the sample becomes the listing's `updated_at` (and `created_at`), written
 * with a query after the save: `updated_at` is `autoUpdate`, and a model `save()` would put it
 * back to now, which would make every seeded ad look updated today and defeat the badge that
 * says how stale an ad is. `owner.verified` becomes a verification instant, that same day.
 */
export default class ListingSeeder extends BaseSeeder {
  static override environment = ['development']

  override async run() {
    await NeighborhoodSeeder.ensure()

    const neighborhoods = await Neighborhood.query().whereIn(
      'slug',
      LISTINGS.map((listing) => listing.neighborhood),
    )

    for (const listing of LISTINGS) {
      const neighborhood = neighborhoods.find(
        (each) => each.slug === listing.neighborhood,
      )

      if (!neighborhood)
        throw new Error(
          `listing "${listing.slug}" points to the neighborhood "${listing.neighborhood}", which does not exist`,
        )

      await this.seed(listing, neighborhood.id)
    }
  }

  private async seed(listing: Listing, neighborhoodId: string) {
    const day = DateTime.fromISO(`${listing.owner.updatedAt}T12:00:00`, {
      zone: 'utc',
    })
    let verifiedAt: DateTime | null = null
    if (listing.owner.verified) verifiedAt = day

    const row = await ListingModel.updateOrCreate(
      { slug: listing.slug },
      {
        status: LISTING_STATUS.PUBLISHED,
        type: listing.type,
        title: listing.title,
        description: listing.description,
        neighborhoodId,
        address: listing.address,
        priceMonthly: listing.price.monthly,
        priceDaily: listing.price.daily,
        costWater: listing.costs.water,
        costElectricity: listing.costs.electricity,
        costInternet: listing.costs.internet,
        periods: [...listing.periods],
        minimumStayMonths: listing.minimumStayMonths,
        availableFrom: DateTime.fromISO(listing.availableFrom),
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        furnished: listing.furnished,
        rules: [...listing.rules],
        ownerName: listing.owner.name,
        ownerWhatsapp: listing.owner.whatsapp,
        ownerVerifiedAt: verifiedAt,
        lat: listing.lat,
        lng: listing.lng,
        deletedAt: null,
      },
    )

    await ListingModel.query()
      .where('id', row.id)
      .update({ createdAt: day, updatedAt: day })

    await ListingPhotoModel.updateOrCreateMany(
      ['listingId', 'position'],
      listing.photos.map((photo, position) => ({
        listingId: row.id,
        position,
        environment: PHOTO_ENVIRONMENT[photo.environment],
      })),
    )

    await ListingPhotoModel.query()
      .where('listingId', row.id)
      .where('position', '>=', listing.photos.length)
      .delete()
  }
}
