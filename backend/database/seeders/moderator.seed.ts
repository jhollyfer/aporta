import logger from '@adonisjs/core/services/logger'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { ACTIVE_STATUS, USER_ROLE } from '@aporta/shared'

import User from '#models/user'
import env from '#start/env'

/**
 * The demo moderator, so the review queue (`/administrator/listings`) can be tried by someone who
 * is not the administrator and the role matrix is not only tested, but seen. Part of the demo
 * (`_standards/backend.md` §6.2, "Seed ligado pela chave"): switched on by `SEED_DEMO_PASSWORD`
 * having a value, in any environment; empty skips it with one line. The e-mail is on the reserved
 * `example.com` domain, which can never receive mail.
 *
 * Idempotent by email, and restores the account if someone archived it.
 */
export default class ModeratorSeeder extends BaseSeeder {
  /** The address of the demo moderator: `<role>@example.com`. */
  static readonly EMAIL = 'moderator@example.com'

  override async run() {
    const password = env.get('SEED_DEMO_PASSWORD')

    if (!password) {
      logger.info(
        'SEED_DEMO_PASSWORD is empty: the demo moderator seed was skipped',
      )
      return
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
