import logger from '@adonisjs/core/services/logger'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { ACTIVE_STATUS, USER_ROLE } from '@aporta/shared'
import { DateTime } from 'luxon'

import User from '#models/user'
import env from '#start/env'

/**
 * The demo owner of the sample ads: an `OWNER` account, so that the owner's side of the platform
 * (`/owner/listings`) has an ad to list and edit without anyone signing up first. Part of the demo
 * (`_standards/backend.md` §6.2, "Seed ligado pela chave"): switched on by `SEED_DEMO_PASSWORD`
 * having a value, in any environment, and with the key empty the account does not exist. The
 * sample ads are fictional, and so is their owner: nothing here runs in a database whose
 * operator did not ask for the demo.
 *
 * The e-mail is on the reserved `example.com` domain (`<role>@example.com`), so it can never
 * receive mail. The password is the demo's own, never `SEED_OWNER_PASSWORD`.
 *
 * Idempotent by email (`updateOrCreate`), restoring the account if someone archived it, and
 * run first by `ListingSeeder` through `ensure()`, because `db:seed` runs the files in the order
 * the filesystem returns them, which is not the order the foreign keys need.
 */
export default class SampleOwnerSeeder extends BaseSeeder {
  /** The address the sample ads belong to: `<role>@example.com`. */
  static readonly EMAIL = 'owner@example.com'

  /**
   * The upsert as a `static`, so the seeder that depends on the account runs it without building
   * another seeder (`new` of a collaborator is what the house forbids). Returns the account id,
   * or `null` when the demo is off.
   */
  static async ensure(): Promise<string | null> {
    const password = env.get('SEED_DEMO_PASSWORD')

    if (!password) {
      logger.info(
        'SEED_DEMO_PASSWORD is empty: the demo owner seed was skipped',
      )
      return null
    }

    const owner = await User.updateOrCreate(
      { email: SampleOwnerSeeder.EMAIL },
      {
        name: 'Dono de exemplo',
        email: SampleOwnerSeeder.EMAIL,
        password,
        role: USER_ROLE.OWNER,
        status: ACTIVE_STATUS.ACTIVE,
        // The "verified owner" seal is the account's now, and the twelve sample ads share this
        // account, so they all carry it. The mixed seals the catalog used to have (`owner_verified_at`
        // per ad) cannot be told apart through one account; the column stays for ads with no account.
        verifiedAt: DateTime.now(),
        deletedAt: null,
      },
    )

    return owner.id
  }

  override async run() {
    await SampleOwnerSeeder.ensure()
  }
}
