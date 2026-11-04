import app from '@adonisjs/core/services/app'
import { STORAGE_MIMETYPE, TRASHED_MODE } from '@aporta/shared'
import { test } from '@japa/runner'

import StorageOrphans from './_shared.storage-orphans.ts'

import { ListingPhotoFactory } from '#database/factories/listing-photo.factory'
import StorageRepository from '#repositories/storage/storage.repository'
import StorageContract from '#services/storage/storage.contract'
import { resetDatabase, storageRecord } from '#tests/database-fixtures'
import { listing } from '#tests/storefront-fixtures'

/**
 * The sweep against the real table and the real bucket: the reference check reads
 * `listing_photos` and `users.avatar_id`, and the object is really deleted from the bucket. The
 * photos of the demo seed are shared by several ads, which is the case the rule exists for.
 */
test.group('features > _shared.storage-orphans', (group) => {
  group.each.setup(() => resetDatabase())

  /** A finished upload with a real object under its `path`. */
  async function stored(bucket: StorageContract) {
    const row = await storageRecord()
    const put = await bucket.put(
      row.path,
      new Uint8Array([0xff, 0xd8, 0xff]),
      STORAGE_MIMETYPE.JPEG,
    )
    if (put.isLeft()) throw new Error('the bucket refused the test object')

    return row
  }

  async function exists(bucket: StorageContract, path: string) {
    const meta = await bucket.metadata(path)

    return meta.isRight() && meta.value !== null
  }

  test('when the file is an orphan, the object leaves the bucket and the row leaves the table', async ({
    assert,
  }) => {
    const bucket = await app.container.make(StorageContract)
    const files = await app.container.make(StorageRepository)
    const row = await stored(bucket)
    assert.isTrue(await exists(bucket, row.path))

    const result = await StorageOrphans.sweep([row.id], files, bucket)

    assert.deepEqual(result.value, { removed: [row.id], kept: [] })
    assert.isFalse(await exists(bucket, row.path))
    assert.isNull(await files.findById(row.id, TRASHED_MODE.WITH))
  })

  test('when two ads share the picture, it survives until the last one lets go of it', async ({
    assert,
  }) => {
    const bucket = await app.container.make(StorageContract)
    const files = await app.container.make(StorageRepository)
    const row = await stored(bucket)
    const first = await listing()
    const second = await listing()
    const firstPhoto = await ListingPhotoFactory.merge({
      listingId: first.id,
      position: 0,
      storageId: row.id,
    }).create()
    const secondPhoto = await ListingPhotoFactory.merge({
      listingId: second.id,
      position: 0,
      storageId: row.id,
    }).create()

    await firstPhoto.delete()
    const whileShared = await StorageOrphans.sweep([row.id], files, bucket)

    assert.deepEqual(whileShared.value, { removed: [], kept: [row.id] })
    assert.isTrue(await exists(bucket, row.path))
    assert.isNotNull(await files.findById(row.id, TRASHED_MODE.WITH))

    await secondPhoto.delete()
    const afterLast = await StorageOrphans.sweep([row.id], files, bucket)

    assert.deepEqual(afterLast.value, { removed: [row.id], kept: [] })
    assert.isFalse(await exists(bucket, row.path))
  })
})
