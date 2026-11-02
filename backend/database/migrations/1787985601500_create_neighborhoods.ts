import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'neighborhoods'

  override up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      // The public address of the neighborhood: the filter and the listing's card carry it, never
      // the `id`. `UNIQUE` across the whole table, archived included, so a slug is never reused.
      table.string('slug', 60).notNullable().unique()
      table.string('name', 80).notNullable()
      // `double precision`, not `decimal`: the driver delivers `decimal` as text, and the map pin
      // needs a number. The center is approximate by nature (a pin, not a survey).
      table.double('lat').notNullable()
      table.double('lng').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      table.timestamp('deleted_at').nullable()
    })

    return Promise.resolve()
  }

  override down(): Promise<void> {
    this.schema.dropTable(this.tableName)

    return Promise.resolve()
  }
}
