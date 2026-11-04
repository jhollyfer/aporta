import { randomUUID } from 'node:crypto'

import { TRASHED_MODE } from '@aporta/shared'
import { test } from '@japa/runner'

import StorageOrphans from './_shared.storage-orphans.ts'

import StorageMemoryRepository from '#repositories/storage/storage.memory.repository'
import { STORAGE_REFERENCE } from '#repositories/storage/storage.repository'
import StorageFake from '#services/storage/storage.fake'
import { storageDraft } from '#tests/repository-fixtures'

/** A finished upload, with its object in the fake bucket. */
async function uploaded(files: StorageMemoryRepository, bucket: StorageFake) {
  const file = storageDraft({ size: 5 })
  file.confirm(5)
  await files.save(file)
  bucket.object(file.snapshot().path, 5)

  return file
}

test.group('features > _shared.storage-orphans (unit)', () => {
  test('when nothing references the file, it deletes the binary and the row', async ({
    assert,
  }) => {
    const files = new StorageMemoryRepository()
    const bucket = new StorageFake()
    const orphan = await uploaded(files, bucket)

    const result = await StorageOrphans.sweep([orphan.id], files, bucket)

    assert.deepEqual(result.value, { removed: [orphan.id], kept: [] })
    assert.isTrue(bucket.discarded(orphan.snapshot().path))
    assert.isNull(await files.findById(orphan.id, TRASHED_MODE.WITH))
  })

  test('when a record still references the file, it stays in the bucket and in the table', async ({
    assert,
  }) => {
    const files = new StorageMemoryRepository()
    const bucket = new StorageFake()
    const used = await uploaded(files, bucket)
    files.reference(used.id, STORAGE_REFERENCE.LISTING_PHOTO)

    const result = await StorageOrphans.sweep([used.id], files, bucket)

    assert.deepEqual(result.value, { removed: [], kept: [used.id] })
    assert.isFalse(bucket.discarded(used.snapshot().path))
    assert.isNotNull(await files.findById(used.id, TRASHED_MODE.WITH))
  })

  test('when two ads share the file (the demo seed) and one lets go, the file stays until the last one does', async ({
    assert,
  }) => {
    const files = new StorageMemoryRepository()
    const bucket = new StorageFake()
    const shared = await uploaded(files, bucket)
    files.reference(shared.id, STORAGE_REFERENCE.LISTING_PHOTO)
    files.reference(shared.id, STORAGE_REFERENCE.LISTING_PHOTO)

    // One ad dropped its photo row; the other still points at the file.
    const first = await StorageOrphans.sweep([shared.id], files, bucket)

    assert.deepEqual(first.value, { removed: [], kept: [shared.id] })
    assert.isFalse(bucket.discarded(shared.snapshot().path))
  })

  test('when the list mixes orphans, used files, repeats, PENDING and unknown ids, only the orphans go', async ({
    assert,
  }) => {
    const files = new StorageMemoryRepository()
    const bucket = new StorageFake()
    const orphan = await uploaded(files, bucket)
    const used = await uploaded(files, bucket)
    files.reference(used.id, STORAGE_REFERENCE.USER_AVATAR)
    const pending = storageDraft()
    await files.save(pending)
    const unknown = randomUUID()

    const result = await StorageOrphans.sweep(
      [orphan.id, orphan.id, used.id, pending.id, unknown],
      files,
      bucket,
    )

    assert.deepEqual(result.value, {
      removed: [orphan.id],
      kept: [used.id, pending.id, unknown],
    })
    assert.isNotNull(await files.findById(pending.id, TRASHED_MODE.WITH))
  })

  test('when the bucket fails, it returns the failure and keeps the row', async ({
    assert,
  }) => {
    const files = new StorageMemoryRepository()
    const bucket = new StorageFake()
    const orphan = await uploaded(files, bucket)
    bucket.failWith(new Error('network'))

    const result = await StorageOrphans.sweep([orphan.id], files, bucket)

    assert.isTrue(result.isLeft())
    assert.isNotNull(await files.findById(orphan.id, TRASHED_MODE.WITH))
  })

  test('when the list is empty, it does nothing', async ({ assert }) => {
    const result = await StorageOrphans.sweep(
      [],
      new StorageMemoryRepository(),
      new StorageFake(),
    )

    assert.deepEqual(result.value, { removed: [], kept: [] })
  })
})
