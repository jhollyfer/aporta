import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'listing_photos'

  override up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      // The photos go with the ad: deleting the listing for good takes them along.
      table
        .uuid('listing_id')
        .notNullable()
        .references('id')
        .inTable('listings')
        .onDelete('CASCADE')
      table.string('environment', 20).notNullable()
      // The order the owner chose; the position, and not the insertion time, is what the gallery follows.
      table.integer('position').notNullable()
      // No foreign key to `storages` yet: until the owner uploads photos (`docs/TASKS.md`, phase 4)
      // a photo is only "this environment has no picture", and the frontend draws the room.
      table.unique(['listing_id', 'position'], {
        indexName: 'listing_photos_listing_id_position_unique',
      })
    })

    return Promise.resolve()
  }

  override down(): Promise<void> {
    this.schema.dropTable(this.tableName)

    return Promise.resolve()
  }
}
