import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The attempts counter of `@adonisjs/limiter`.
 *
 * The column format belongs to the package, not to us: it reads and writes on its own,
 * with no Lucid model. That is why there is also no `deleted_at` nor the
 * timestamps of the rest of the schema - the row vanishes when it expires
 * (`clearExpiredByTimeout`), and a counter row is not a domain record.
 */
export default class extends BaseSchema {
  protected tableName = 'rate_limits'

  override up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.string('key', 255).notNullable().primary()
      table.integer('points', 9).notNullable().defaultTo(0)
      table.bigint('expire').unsigned()
    })

    return Promise.resolve()
  }

  override down(): Promise<void> {
    this.schema.dropTable(this.tableName)

    return Promise.resolve()
  }
}
