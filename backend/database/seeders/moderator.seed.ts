import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { ACTIVE_STATUS, USER_ROLE } from '@aporta/shared'

import User from '#models/user'
import env from '#start/env'

/**
 * A moderator for development, so the review queue (`/administrator/listings`) can be tried by
 * someone who is not the administrator and the role matrix is not only tested, but seen. Same
 * reasoning as `SampleOwnerSeeder`: development only, an email on the reserved `.example` domain
 * that can never receive mail, and the password of the administrator seeder (`SEED_OWNER_PASSWORD`)
 * instead of a second secret or a literal. In production the moderator is created by the
 * administrator, through the panel.
 *
 * Idempotent by email, and restores the account if someone archived it.
 */
export default class ModeratorSeeder extends BaseSeeder {
  static override environment = ['development']

  /** The address of the development moderator. */
  static readonly EMAIL = 'moderador.exemplo@aporta.example'

  override async run() {
    const password = env.get('SEED_OWNER_PASSWORD')

    if (!password) {
      throw new Error(
        'SEED_OWNER_PASSWORD missing. The sample moderator uses the same password as the administrator: ' +
          'SEED_OWNER_PASSWORD=<password> node ace db:seed',
      )
    }

    await User.updateOrCreate(
      { email: ModeratorSeeder.EMAIL },
      {
        name: 'Moderação de exemplo',
        email: ModeratorSeeder.EMAIL,
        password,
        role: USER_ROLE.MODERATOR,
        status: ACTIVE_STATUS.ACTIVE,
        deletedAt: null,
      },
    )
  }
}
