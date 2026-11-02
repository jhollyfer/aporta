import logger from '@adonisjs/core/services/logger'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { ACTIVE_STATUS, USER_ROLE } from '@aporta/shared'

import User from '#models/user'
import env from '#start/env'

/**
 * The first administrator. No endpoint creates an account without a session - the panel is
 * the only user entry door -, so without this seeder a new database
 * would have nowhere to start. "Owner" in `SEED_OWNER_*` is the owner of the platform: it has
 * nothing to do with the `OWNER` role, which is the owner of a property. Switched on by
 * `SEED_OWNER_PASSWORD`, in any environment.
 */
export default class extends BaseSeeder {
  override async run() {
    const email = env.get('SEED_OWNER_EMAIL')
    const password = env.get('SEED_OWNER_PASSWORD')

    /*
     * The seed is switched on by the password having a value, in any environment (`_standards/backend.md`
     * §6.2, "Seed ligado pela chave"): empty skips it with one line and the rest of `db:seed` runs.
     * The password is never a literal here, and the seeder does not invent one: the repository is the
     * wrong place for a credential, and whoever read this file would enter as administrator in every
     * environment that had run it.
     */
    if (!password) {
      logger.info(
        'SEED_OWNER_PASSWORD is empty: the first administrator seed was skipped',
      )
      return
    }

    // The pair goes together: a password with no e-mail would create an account nobody can name.
    if (!email) {
      throw new Error(
        'SEED_OWNER_EMAIL missing. SEED_OWNER_PASSWORD and SEED_OWNER_EMAIL go together: ' +
          'SEED_OWNER_EMAIL=<email> SEED_OWNER_PASSWORD=<password> node ace db:seed',
      )
    }

    // `updateOrCreate(searchPayload, savePayload)`: the first argument is only the
    // search key. Passing `password` in it would never match, because the column
    // holds the hash - and the record would be born without `name` or `password`, which are
    // `notNullable`.
    // `status` and `deletedAt` go in the `savePayload` even though they have a default in the
    // database: running the seeder is the recovery path when someone deactivates
    // or archives the last administrator through the panel. Without these two lines the
    // record would be found, updated and still unable to sign in.
    await User.updateOrCreate(
      { email },
      {
        name: 'Administrador',
        email,
        password,
        role: USER_ROLE.ADMINISTRATOR,
        status: ACTIVE_STATUS.ACTIVE,
        deletedAt: null,
      },
    )
  }
}
