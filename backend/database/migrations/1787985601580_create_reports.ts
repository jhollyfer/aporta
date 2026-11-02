import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The scam reports a visitor files against an ad, with no account.
 *
 * `reporter_hash` is a keyed hash of the address the report came from (HMAC with `APP_KEY`), never
 * the address itself: it lets the staff see that several reports share an origin and lets the
 * database forget where anyone connected from. Nullable because the address may be missing.
 *
 * `listing_id` is `RESTRICT`: a report is evidence, and it should not vanish with the ad. The ad is
 * archived (the trash), never deleted. `resolved_by` is `SET NULL` for the same reason as
 * `listings.reviewed_by`.
 */
export default class extends BaseSchema {
  protected tableName = 'reports'

  override up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      table
        .uuid('listing_id')
        .notNullable()
        .references('id')
        .inTable('listings')
        .onDelete('RESTRICT')
      table.string('reason', 20).notNullable()
      table.string('details', 500).nullable()
      table.string('reporter_hash', 64).nullable()
      table.string('status', 20).notNullable().defaultTo('OPEN')
      table
        .uuid('resolved_by')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('resolved_at').nullable()
      table.string('resolution_note', 500).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      // The staff's queue: by status, oldest first.
      table.index(['status', 'created_at'], 'reports_status_created_at_index')
      table.index(['listing_id'], 'reports_listing_id_index')
    })

    return Promise.resolve()
  }

  override down(): Promise<void> {
    this.schema.dropTable(this.tableName)

    return Promise.resolve()
  }
}
