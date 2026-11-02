import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The ad learns who wrote it. First step of two (`_standards/backend.md` §4.13, expand and
 * contract): `owner_id` is born nullable because the ads that exist today were seeded without an
 * account, and the denormalized `owner_name`, `owner_whatsapp` and `owner_verified_at` stay as
 * they are, since the storefront still reads the contact from them. Dropping them is a later
 * contract step, after the deploy that stops reading them.
 *
 * `RESTRICT`, and not `CASCADE` or `SET NULL`: deleting an account must not take its ads with it
 * nor leave a published ad with no one who can edit it. The account is archived, or its ads are
 * handed over first.
 *
 * Reversible: `down` drops the column, and with it the foreign key and the index.
 */
export default class extends BaseSchema {
  protected tableName = 'listings'

  override up(): Promise<void> {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .uuid('owner_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT')
      // Serves "which ads does this account own", asked by the owner's own listing.
      table.index(['owner_id'], 'listings_owner_id_index')
    })

    return Promise.resolve()
  }

  override down(): Promise<void> {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['owner_id'], 'listings_owner_id_index')
      table.dropColumn('owner_id')
    })

    return Promise.resolve()
  }
}
