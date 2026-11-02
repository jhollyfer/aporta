import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'

import { PLACES } from '#database/data/places'
import NeighborhoodSeeder from '#database/seeders/neighborhood.seed'
import Neighborhood from '#models/neighborhood'
import Place from '#models/place'

/**
 * The ten sample places of the guide. Development only (`static environment`), for the reason the
 * listing seeder explains: the phones are fictional and the curation is not the city's yet.
 *
 * Idempotent by `(category, name)` (`updateOrCreateMany`, _doc-lib/lucid.md#seeders): unlike the
 * neighborhoods and the listings, a place has no `slug`, and the sample never repeats a name inside
 * a category. It runs the neighborhood seeder first, like the listing one.
 */
export default class PlaceSeeder extends BaseSeeder {
  static override environment = ['development']

  override async run() {
    await NeighborhoodSeeder.ensure()

    const neighborhoods = await Neighborhood.query().whereIn(
      'slug',
      PLACES.map((place) => place.neighborhood),
    )

    await Place.updateOrCreateMany(
      ['category', 'name'],
      PLACES.map((place) => {
        const neighborhood = neighborhoods.find(
          (each) => each.slug === place.neighborhood,
        )

        if (!neighborhood)
          throw new Error(
            `place "${place.name}" points to the neighborhood "${place.neighborhood}", which does not exist`,
          )

        let date: DateTime | null = null
        if (place.date) date = DateTime.fromISO(place.date)

        return {
          category: place.category,
          name: place.name,
          description: place.description,
          neighborhoodId: neighborhood.id,
          address: place.address,
          hours: place.hours,
          whatsapp: place.whatsapp,
          date,
          deletedAt: null,
        }
      }),
    )
  }
}
