import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Second step of two (`_standards/backend.md` §4.13): `storages.owner_id` becomes `NOT NULL`,
 * because the previous migration gave every existing file an owner and every new one is born
 * with the `actor` of the `create`. The database itself now refuses an ownerless file.
 *
 * Raw SQL and not `alter()`: the knex `alter()` rebuilds the column and its constraints, and
 * the only change wanted is the null constraint.
 */
export default class extends BaseSchema {
  protected tableName = 'storages'

  override up(): Promise<void> {
    this.schema.raw(
      `ALTER TABLE "${this.tableName}" ALTER COLUMN "owner_id" SET NOT NULL`,
    )

    return Promise.resolve()
  }

  override down(): Promise<void> {
    this.schema.raw(
      `ALTER TABLE "${this.tableName}" ALTER COLUMN "owner_id" DROP NOT NULL`,
    )

    return Promise.resolve()
  }
}
