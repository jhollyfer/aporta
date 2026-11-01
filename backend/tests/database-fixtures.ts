import testUtils from '@adonisjs/core/services/test_utils'
import { z } from '@aporta/shared'

import { StorageFactory } from '#database/factories/storage.factory'
import { UserFactory } from '#database/factories/user.factory'
import type Storage from '#models/storage'

/**
 * Empties the database and recreates the administrator.
 *
 * `truncate` deletes the administrator along, and it is the only user that no
 * endpoint creates without a session - without seeding again, no panel test would have
 * anywhere to start.
 */
export async function resetDatabase() {
  // `truncate()` does NOT truncate: it runs the migrations and **returns** the function that
  // truncates, which Japa registers as the test teardown. Discarding that return
  // means the database is never cleaned, and a test starts seeing the previous one's data.
  const teardown = await testUtils.db().truncate()

  await testUtils.db().seed()

  return teardown
}

const CountRows = z.array(z.object({ count: z.coerce.number() }))

/**
 * The number a `count('* as count')` query answers. The driver delivers `bigint` as text and the
 * builder types the rows as `any`, so the rows enter as `unknown` and are read by the schema.
 */
export async function countRows(query: PromiseLike<unknown>): Promise<number> {
  const rows: unknown = await query
  return CountRows.parse(rows)[0]?.count ?? 0
}

/**
 * An already confirmed file row, to attach as an avatar or to list.
 *
 * `UPLOADED` because it is the only state `StorageRepository.allUploaded` accepts: the
 * row is born before the binary, and attaching a `PENDING` would publish a half-uploaded
 * image. The values live in `database/factories/`; what stays here is the short signature
 * the specs use. `owner_id` is `NOT NULL`: a file without an `ownerId` gets an account of its own.
 */
export async function storageRecord(attributes: Partial<Storage> = {}) {
  const ownerId = attributes.ownerId ?? (await UserFactory.create()).id

  return StorageFactory.merge({ ...attributes, ownerId }).create()
}
