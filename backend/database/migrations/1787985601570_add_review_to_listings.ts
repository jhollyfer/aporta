import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * What the review leaves on the ad: when it went on the air, and the last decision with its reason
 * and its author. Additive only; every column is nullable because an ad that was never reviewed
 * has none of them.
 *
 * `reviewed_by` is `SET NULL` and not `RESTRICT`: the staff account can be deleted for good
 * (`UserRepository.delete`), and the decision should outlive the person who made it instead of
 * blocking the deletion with a foreign-key error.
 *
 * The ads that are already `PUBLISHED` (the seeded catalog and anything approved by hand) get
 * `published_at` from their last update, so "since when is it on the air" is never empty for an ad
 * that is.
 *
 * Reversible: `down` drops the columns.
 */
export default class extends BaseSchema {
  protected tableName = 'listings'

  override async up(): Promise<void> {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('published_at').nullable()
      table.text('review_note').nullable()
      table.timestamp('reviewed_at').nullable()
      table
        .uuid('reviewed_by')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
    })

    this.defer(async (db) => {
      await db
        .from(this.tableName)
        .where('status', 'PUBLISHED')
        .whereNull('published_at')
        .update({ published_at: db.raw('updated_at') })
    })

    await Promise.resolve()
  }

  override down(): Promise<void> {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('reviewed_by')
      table.dropColumn('reviewed_at')
      table.dropColumn('review_note')
      table.dropColumn('published_at')
    })

    return Promise.resolve()
  }
}
