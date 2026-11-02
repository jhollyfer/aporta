import { BaseSeeder } from '@adonisjs/lucid/seeders'

import { NEIGHBORHOODS } from '#database/data/neighborhoods'
import Neighborhood from '#models/neighborhood'

/**
 * The six neighborhoods the filter offers. Development only
 * (`static environment`): the real neighborhoods are confirmed with the board before the platform
 * opens to the public (`docs/TASKS.md` 7.10), and a production database must not be born with
 * approximate coordinates nobody checked.
 *
 * Idempotent by `slug` (`updateOrCreateMany`, _doc-lib/lucid.md#seeders): the second run updates
 * the same six rows instead of adding six more. The listing and place seeders run this one first,
 * because `db:seed` runs the files in the order the filesystem returns them, which is not the
 * order the foreign keys need.
 */
export default class NeighborhoodSeeder extends BaseSeeder {
  static override environment = ['development']

  /**
   * The upsert as a `static`, so the seeders that depend on the neighborhoods run it without
   * building another seeder (`new` of a collaborator is what the house forbids), and the
   * dependency stays explicit in the code instead of in the order of the filenames.
   */
  static async ensure(): Promise<void> {
    await Neighborhood.updateOrCreateMany(
      'slug',
      NEIGHBORHOODS.map((neighborhood) => ({
        slug: neighborhood.slug,
        name: neighborhood.name,
        lat: neighborhood.lat,
        lng: neighborhood.lng,
        // The restore path, as in `user.seed.ts`: running the seeder is how a neighborhood that
        // someone archived comes back.
        deletedAt: null,
      })),
    )
  }

  override async run() {
    await NeighborhoodSeeder.ensure()
  }
}
