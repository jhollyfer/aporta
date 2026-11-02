import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * A photo slot gets its file. Nullable on purpose: the seeded photos are still slots with no
 * picture, and the frontend draws the environment for them.
 *
 * `SET NULL`: deleting the file (the storage `delete` only deletes an orphan, and a photo
 * counts as a reference) must never take the slot with it, so the ad goes back to "no picture
 * yet" instead of losing the room.
 *
 * Reversible: `down` drops the column, and with it the foreign key and the index.
 */
export default class extends BaseSchema {
  protected tableName = 'listing_photos'

  override up(): Promise<void> {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .uuid('storage_id')
        .nullable()
        .references('id')
        .inTable('storages')
        .onDelete('SET NULL')
      // Serves "is this file used by a listing photo", asked before a file is deleted.
      table.index(['storage_id'], 'listing_photos_storage_id_index')
    })

    return Promise.resolve()
  }

  override down(): Promise<void> {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['storage_id'], 'listing_photos_storage_id_index')
      table.dropColumn('storage_id')
    })

    return Promise.resolve()
  }
}
