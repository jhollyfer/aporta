import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { ACTIVE_STATUS, USER_ROLE } from '@aporta/shared'

import User from '#models/user'
import env from '#start/env'

/**
 * The owner of the sample ads: an `OWNER` account, so that in development the owner's side of the
 * platform (`/owner/listings`) has an ad to list and edit without anyone signing up first.
 * Development only (`static environment`), for the reason the other catalog seeders give: the
 * sample ads are fictional, and so is their owner. It must never exist in production, where a
 * known email with a known role would be an account anyone could try.
 *
 * The email is on the reserved `.example` domain, so it can never receive mail. The password is
 * `SEED_OWNER_PASSWORD`, the one the administrator seeder already requires in development:
 * a second variable would be one more secret to forget, and a literal here would be a credential
 * in the repository. Without it the seeder stops, like the administrator's.
 *
 * Idempotent by email (`updateOrCreate`), restoring the account if someone archived it, and
 * run first by `ListingSeeder` through `ensure()`, because `db:seed` runs the files in the order
 * the filesystem returns them, which is not the order the foreign keys need.
 */
export default class SampleOwnerSeeder extends BaseSeeder {
  static override environment = ['development']

  /** The address the sample ads belong to. */
  static readonly EMAIL = 'dono.exemplo@aporta.example'

  /**
   * The upsert as a `static`, so the seeder that depends on the account runs it without building
   * another seeder (`new` of a collaborator is what the house forbids). Returns the account id.
   */
  static async ensure(): Promise<string> {
    const password = env.get('SEED_OWNER_PASSWORD')

    if (!password) {
      throw new Error(
        'SEED_OWNER_PASSWORD missing. The sample owner uses the same password as the administrator: ' +
          'SEED_OWNER_PASSWORD=<password> node ace db:seed',
      )
    }

    const owner = await User.updateOrCreate(
      { email: SampleOwnerSeeder.EMAIL },
      {
        name: 'Dono de exemplo',
        email: SampleOwnerSeeder.EMAIL,
        password,
        role: USER_ROLE.OWNER,
        status: ACTIVE_STATUS.ACTIVE,
        deletedAt: null,
      },
    )

    return owner.id
  }

  override async run() {
    await SampleOwnerSeeder.ensure()
  }
}
