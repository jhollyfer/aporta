import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The "verified owner" seal moves to the account. The staff confirms a person, and a person has
 * many ads: keeping the instant on each ad (`listings.owner_verified_at`) meant verifying the same
 * owner once per ad and losing the seal on the ad that was written the next day.
 *
 * Expand step only (`_standards/backend.md` §4.13): the old column stays, because the ads seeded
 * without an account (`owner_id` null) still read their seal from it. Null is "not verified".
 *
 * Reversible: `down` drops the column.
 */
export default class extends BaseSchema {
  protected tableName = 'users'

  override up(): Promise<void> {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('verified_at').nullable()
    })

    return Promise.resolve()
  }

  override down(): Promise<void> {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('verified_at')
    })

    return Promise.resolve()
  }
}
