import { BaseSchema } from '@adonisjs/lucid/schema'
import { USER_ROLE, z } from '@aporta/shared'

/**
 * Every file has an owner from the `create` (`_standards/backend.md` §5.4: "there is no
 * anonymous upload"). First step of two (`_standards/backend.md` §4.13, expand and contract): the column
 * is born nullable and the rows that already exist are given an owner here; the next migration
 * makes it `NOT NULL`.
 *
 * **The backfill.** A file that exists today was uploaded by someone the table never recorded,
 * so the owner assigned to it is the oldest `ADMINISTRATOR` account - the one the seeder creates
 * (`SEED_OWNER_EMAIL`) -, and, if there is no administrator, the oldest account of any role.
 * If there are files and no account at
 * all, the migration refuses instead of inventing an owner: seed the first account, then migrate.
 *
 * `RESTRICT`, and not `CASCADE` or `SET NULL`: deleting an account must not take its files (a
 * listing photo would vanish) and the column cannot go back to null. The use-case that deletes
 * an account hands its files over first (`StorageRepository.transferOwnership`).
 *
 * Reversible: `down` drops the column, and with it the foreign key and the index.
 */
const Owners = z.array(z.object({ id: z.string() }))

export default class extends BaseSchema {
  protected tableName = 'storages'

  override up(): Promise<void> {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .uuid('owner_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT')
      // Serves "which files does this account own", asked when an account is deleted.
      table.index(['owner_id'], 'storages_owner_id_index')
    })

    this.defer(async (db) => {
      const owners = Owners.parse(
        await db
          .from('users')
          .select('id')
          .orderByRaw('(role = ?) desc', [USER_ROLE.ADMINISTRATOR])
          .orderBy('created_at', 'asc')
          .limit(1),
      )

      const owner = owners[0]

      if (owner) {
        await db
          .from(this.tableName)
          .whereNull('owner_id')
          .update({ owner_id: owner.id })

        return
      }

      const files = await db.from(this.tableName).count('* as total')
      const total = z
        .array(z.object({ total: z.coerce.number() }))
        .parse(files)[0]?.total

      if (total !== undefined && total > 0)
        throw new Error(
          `${total} files in "storages" and no account to own them: run the seeder, then migrate`,
        )
    })

    return Promise.resolve()
  }

  override down(): Promise<void> {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['owner_id'], 'storages_owner_id_index')
      table.dropColumn('owner_id')
    })

    return Promise.resolve()
  }
}
