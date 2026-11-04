import { inject } from '@adonisjs/core'

import type { AccessChangeContext } from '#domain/user/user.entity'
import ListingRepository from '#repositories/listing/listing.repository'
import UserRepository from '#repositories/user/user.repository'

/**
 * Reads the facts the `User` entity needs to decide a role or status change: who acts, how many
 * active administrators exist and whether the account still has an ad. Both change actions use
 * it, so the questions to the repositories are asked in one place.
 */
@inject()
export default class AdministratorUserAccess {
  constructor(
    private readonly users: UserRepository,
    private readonly listings: ListingRepository,
  ) {}

  async context(
    actorId: string,
    accountId: string,
  ): Promise<AccessChangeContext> {
    return {
      actorId,
      activeAdministrators: await this.users.countActiveAdministrators(),
      hasLiveListings: await this.listings.existsLiveByOwner(accountId),
    }
  }
}
