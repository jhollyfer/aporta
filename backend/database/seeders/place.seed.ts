import logger from '@adonisjs/core/services/logger'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'

import { PLACES } from '#database/data/places'
import NeighborhoodSeeder from '#database/seeders/neighborhood.seed'
import Neighborhood from '#models/neighborhood'
import Place from '#models/place'
import env from '#start/env'

/**
 * The ten sample places of the guide. Part of the demo, switched on by `SEED_DEMO_PASSWORD`
 * having a value, for the reason the listing seeder explains: the phones are fictional and the
 * curation is not the city's yet. With the key empty it logs one line and skips.
 *
 * Idempotent by `(category, name)` (`updateOrCreateMany`, _doc-lib/lucid.md#seeders): unlike the
 * neighborhoods and the listings, a place has no `slug`, and the sample never repeats a name inside
 * a category. It runs the neighborhood seeder first, like the listing one.
 */
export default class PlaceSeeder extends BaseSeeder {
  override async run() {
    if (!env.get('SEED_DEMO_PASSWORD')) {
      logger.info(
        'SEED_DEMO_PASSWORD is empty: the sample places seed was skipped',
      )
      return
    }

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
