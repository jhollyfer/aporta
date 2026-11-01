import { BaseSchema } from '@adonisjs/lucid/schema'
import { ACTIVE_STATUSES, ACTIVE_STATUS, USER_ROLES } from '@aporta/shared'

export default class extends BaseSchema {
  protected tableName = 'users'

  override up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      table.string('name', 120).notNullable()
      table.string('email', 254).notNullable().unique()
      table.string('password', 255).notNullable()
      // No `defaultTo`: the role is always explicit on the server. A default on
      // `ADMINISTRATOR` would make a forgotten creation path silently save the
      // most powerful role.
      table.enum('role', USER_ROLES).notNullable()
      table
        .enum('status', ACTIVE_STATUSES)
        .notNullable()
        .defaultTo(ACTIVE_STATUS.ACTIVE)
      // Whoever attaches keeps the reference, never the other way around - it is what allows a single
      // file table, with no "owner type" column. `SET NULL` and not
      // `CASCADE`: with it, deleting the avatar image would delete the whole account.
      table
        .uuid('avatar_id')
        .nullable()
        .references('id')
        .inTable('storages')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.timestamp('deleted_at').nullable()
    })

    return Promise.resolve()
  }

  override down(): Promise<void> {
    this.schema.dropTable(this.tableName)

    return Promise.resolve()
  }
}
