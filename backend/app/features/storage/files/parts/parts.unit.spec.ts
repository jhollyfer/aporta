import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import StorageFilePartsUseCase from './parts.use-case.ts'

import StorageMemoryRepository from '#repositories/storage/storage.memory.repository'
import { PART_SIZE } from '#services/multipart/multipart.contract'
import MultipartFake from '#services/multipart/multipart.fake'
import StorageFake from '#services/storage/storage.fake'
import { storageDraft } from '#tests/repository-fixtures'

function subject() {
  const files = new StorageMemoryRepository()
  const storage = new StorageFake()
  const multipart = new MultipartFake()
  const useCase = new StorageFilePartsUseCase(files, storage, multipart)
  return { files, storage, multipart, useCase }
}

test.group('storage > files > parts (unit)', () => {
  test('when the multipart has parts in the bucket, it returns what was uploaded and signs what is missing', async ({
    assert,
  }) => {
    const { files, multipart, useCase } = subject()
    const file = storageDraft({
      size: PART_SIZE * 3,
      partSize: PART_SIZE,
      uploadId: 'upload-x',
    })
    await files.save(file)
    multipart.putPart('upload-x', {
      partNumber: 2,
      size: PART_SIZE,
      etag: 'e2',
    })

    const result = await useCase.execute({ id: file.id })

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.deepEqual(result.value.uploaded, [
      { partNumber: 2, size: PART_SIZE, etag: 'e2' },
    ])
    assert.deepEqual(
      result.value.parts.map((part) => part.partNumber),
      [1, 3],
    )
    assert.containsSubset(result.value.storage, {
      id: file.id,
      url: `fake://${file.snapshot().path}`,
    })
  })

  test('when the single part is already in the bucket, it signs nothing new', async ({
    assert,
  }) => {
    const { files, storage, useCase } = subject()
    const file = storageDraft({ size: 10 })
    await files.save(file)
    storage.object(file.snapshot().path, 10)

    const result = await useCase.execute({ id: file.id })

    assert.containsSubset(result.value, {
      totalParts: 1,
      parts: [],
      uploaded: [{ partNumber: 1, size: 10 }],
    })
  })

  test('when the single part is not in the bucket yet, it lists nothing sent and signs it', async ({
    assert,
  }) => {
    const { files, useCase } = subject()
    const file = storageDraft({ size: 10 })
    await files.save(file)

    const result = await useCase.execute({ id: file.id })

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.deepEqual(result.value.uploaded, [])
    assert.lengthOf(result.value.parts, 1)
  })

  test('when the bucket fails, it answers 500 STORAGE_FILE_PARTS_ERROR and does not pretend nothing was sent', async ({
    assert,
  }) => {
    const { files, storage, useCase } = subject()
    const file = storageDraft({ size: 10 })
    await files.save(file)
    storage.failWith(new Error('bucket down'))

    const result = await useCase.execute({ id: file.id })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'STORAGE_FILE_PARTS_ERROR',
    })
  })

  test('when already confirmed, it returns empty lists', async ({ assert }) => {
    const { files, useCase } = subject()
    const file = storageDraft({ size: 1 })
    file.confirm(1)
    await files.save(file)

    const result = await useCase.execute({ id: file.id })

    assert.containsSubset(result.value, { parts: [], uploaded: [] })
  })

  test('when it does not exist, it answers 404 STORAGE_NOT_FOUND', async ({
    assert,
  }) => {
    const { useCase } = subject()

    const result = await useCase.execute({ id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 404,
      code: 'STORAGE_NOT_FOUND',
    })
  })

  test('when the multipart fails to list the parts, it answers 500 STORAGE_FILE_PARTS_ERROR', async ({
    assert,
  }) => {
    const { files, multipart, useCase } = subject()
    const file = storageDraft({
      size: PART_SIZE * 3,
      partSize: PART_SIZE,
      uploadId: 'upload-x',
    })
    await files.save(file)
    multipart.failWith(new Error('bucket down'))

    const result = await useCase.execute({ id: file.id })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'STORAGE_FILE_PARTS_ERROR',
    })
  })

  test('when the last part is missing, it signs it with the length that is left, not a whole part', async ({
    assert,
  }) => {
    const { files, multipart, useCase } = subject()
    const file = storageDraft({
      size: PART_SIZE * 2 + 5,
      partSize: PART_SIZE,
      uploadId: 'upload-x',
    })
    await files.save(file)
    multipart.putPart('upload-x', {
      partNumber: 2,
      size: PART_SIZE,
      etag: 'e2',
    })

    await useCase.execute({ id: file.id })

    assert.deepEqual(multipart.signed(), [
      { partNumber: 1, contentLength: PART_SIZE },
      { partNumber: 3, contentLength: 5 },
    ])
  })
})
