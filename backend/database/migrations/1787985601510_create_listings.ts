import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The property ad. **The owner is denormalized here on purpose** (`owner_name`,
 * `owner_whatsapp`, `owner_verified_at`): an owner has no account to log into yet, and the ad is
 * what the visitor contacts. When owners get accounts (`docs/TASKS.md`, phase 5) the columns
 * become an `owner_id` in a new expand-and-contract migration.
 */
export default class extends BaseSchema {
  protected tableName = 'listings'

  override up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      table.string('slug', 100).notNullable().unique()
      // Born `DRAFT`: nothing reaches the storefront until someone publishes it.
      table.string('status', 20).notNullable().defaultTo('DRAFT')
      table.string('type', 20).notNullable()
      table.string('title', 80).notNullable()
      table.text('description').notNullable()
      // `RESTRICT`: a neighborhood with ads cannot disappear under them.
      table
        .uuid('neighborhood_id')
        .notNullable()
        .references('id')
        .inTable('neighborhoods')
        .onDelete('RESTRICT')
      table.string('address', 120).notNullable()
      // Whole reais. A hotel quotes only the day and the rest only the month, so each is
      // nullable and the `CHECK` below demands at least one.
      table.integer('price_monthly').nullable()
      table.integer('price_daily').nullable()
      table.boolean('cost_water').notNullable().defaultTo(false)
      table.boolean('cost_electricity').notNullable().defaultTo(false)
      table.boolean('cost_internet').notNullable().defaultTo(false)
      table.specificType('periods', 'text[]').notNullable().defaultTo('{}')
      table.integer('minimum_stay_months').notNullable()
      table.date('available_from').notNullable()
      table.integer('bedrooms').notNullable()
      table.integer('bathrooms').notNullable()
      table.boolean('furnished').notNullable().defaultTo(false)
      table.specificType('rules', 'text[]').notNullable().defaultTo('{}')
      table.string('owner_name', 60).notNullable()
      table.string('owner_whatsapp', 13).notNullable()
      // The moment someone from the platform confirmed the owner. Null is "not verified".
      table.timestamp('owner_verified_at').nullable()
      table.double('lat').notNullable()
      table.double('lng').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      table.timestamp('deleted_at').nullable()
      // The storefront asks "published and not archived" on every read.
      table.index(['status', 'deleted_at'], 'listings_status_deleted_at_index')
      table.index(['neighborhood_id'], 'listings_neighborhood_id_index')
      table.check(
        'price_monthly is not null or price_daily is not null',
        [],
        'listings_price_required_check',
      )
    })

    return Promise.resolve()
  }

  override down(): Promise<void> {
    this.schema.dropTable(this.tableName)

    return Promise.resolve()
  }
}
