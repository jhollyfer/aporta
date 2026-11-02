import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'places'

  override up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      table.string('category', 20).notNullable()
      table.string('name', 80).notNullable()
      table.text('description').notNullable()
      table
        .uuid('neighborhood_id')
        .notNullable()
        .references('id')
        .inTable('neighborhoods')
        .onDelete('RESTRICT')
      table.string('address', 120).notNullable()
      table.string('hours', 80).notNullable()
      // A bank branch or a street fair has no number to talk to.
      table.string('whatsapp', 13).nullable()
      // Only an event has a day (`YYYY-MM-DD`); the entity refuses a date on any other category.
      table.date('date').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      table.timestamp('deleted_at').nullable()
      table.index(
        ['category', 'deleted_at'],
        'places_category_deleted_at_index',
      )
      table.index(['neighborhood_id'], 'places_neighborhood_id_index')
    })

    return Promise.resolve()
  }

  override down(): Promise<void> {
    this.schema.dropTable(this.tableName)

    return Promise.resolve()
  }
}
