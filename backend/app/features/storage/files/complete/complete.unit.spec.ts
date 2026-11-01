import { randomUUID } from 'node:crypto'

import { UPLOAD_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import StorageFileCompleteUseCase from './complete.use-case.ts'

import Translation from '#core/translation'
import StorageMemoryRepository from '#repositories/storage/storage.memory.repository'
import MultipartFake from '#services/multipart/multipart.fake'
import StorageFake from '#services/storage/storage.fake'
import { storageDraft } from '#tests/repository-fixtures'

function subject() {
  const files = new StorageMemoryRepository()
  const storage = new StorageFake()
  const multipart = new MultipartFake()
  const useCase = new StorageFileCompleteUseCase(files, storage, multipart)
  return { files, storage, multipart, useCase }
}

test.group('storage > files > complete (unit)', () => {
  test('when the bucket has the declared size, it closes the multipart and saves UPLOADED', async ({
    assert,
  }) => {
    const { files, storage, multipart, useCase } = subject()
    const file = storageDraft({ size: 20, uploadId: 'upload-x' })
    await files.save(file)
    storage.object(file.snapshot().path, 20)

    const result = await useCase.execute({
      id: file.id,
      parts: [{ partNumber: 1, etag: 'e1' }],
    })

    assert.containsSubset(result.value, {
      status: UPLOAD_STATUS.UPLOADED,
      uploadId: null,
      url: `fake://${file.snapshot().path}`,
    })
    assert.isTrue(multipart.completed('upload-x'))
    const stored = await files.findById(file.id)
    assert.isTrue(stored?.isUploaded())
  })

  test('when the size diverges, it deletes binary and row and answers 422 STORAGE_SIZE_MISMATCH', async ({
    assert,
  }) => {
    const { files, storage, useCase } = subject()
    const file = storageDraft({ size: 20 })
    await files.save(file)
    storage.object(file.snapshot().path, 7)

    const result = await useCase.execute({ id: file.id })

    assert.containsSubset(result.value, {
      status: 422,
      code: 'STORAGE_SIZE_MISMATCH',
      errors: {
        size: Translation.t('fields.STORAGE_SIZE_MISMATCH', {
          received: 7,
          declared: 20,
        }),
      },
    })
    assert.isTrue(storage.discarded(file.snapshot().path))
    assert.isNull(await files.findById(file.id))
  })

  test('when already confirmed, it returns the same record', async ({
    assert,
  }) => {
    const { files, useCase } = subject()
    const file = storageDraft({ size: 1 })
    file.confirm(1)
    await files.save(file)

    const result = await useCase.execute({ id: file.id })

    assert.containsSubset(result.value, {
      id: file.id,
      status: UPLOAD_STATUS.UPLOADED,
    })
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

  test('when the multipart fails to close, it answers 500 STORAGE_FILE_COMPLETE_ERROR and keeps the row PENDING', async ({
    assert,
  }) => {
    const { files, multipart, useCase } = subject()
    const file = storageDraft({ size: 20, uploadId: 'upload-x' })
    await files.save(file)
    multipart.failWith(new Error('bucket down'))

    const result = await useCase.execute({
      id: file.id,
      parts: [{ partNumber: 1, etag: 'e1' }],
    })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'STORAGE_FILE_COMPLETE_ERROR',
    })
    const stored = await files.findById(file.id)
    assert.isFalse(stored?.isUploaded())
  })

  test('when the bytes are an SVG under a declared PNG, it deletes binary and row and answers 422 STORAGE_CONTENT_MISMATCH', async ({
    assert,
  }) => {
    const { files, storage, useCase } = subject()
    const file = storageDraft({ size: 30 })
    await files.save(file)
    storage.object(file.snapshot().path, 30, {
      head: new TextEncoder().encode(
        '<svg xmlns="http://www.w3.org/2000/svg">',
      ),
    })

    const result = await useCase.execute({ id: file.id })

    assert.containsSubset(result.value, {
      status: 422,
      code: 'STORAGE_CONTENT_MISMATCH',
      errors: {
        mimetype: Translation.t('fields.STORAGE_CONTENT_MISMATCH', {
          declared: 'image/png',
        }),
      },
    })
    assert.isTrue(storage.discarded(file.snapshot().path))
    assert.isNull(await files.findById(file.id))
  })

  test('when the stored Content-Type is not the declared one, it refuses with 422 STORAGE_CONTENT_MISMATCH', async ({
    assert,
  }) => {
    const { files, storage, useCase } = subject()
    const file = storageDraft({ size: 30 })
    await files.save(file)
    storage.object(file.snapshot().path, 30, { contentType: 'image/svg+xml' })

    const result = await useCase.execute({ id: file.id })

    assert.containsSubset(result.value, {
      status: 422,
      code: 'STORAGE_CONTENT_MISMATCH',
    })
    assert.isTrue(storage.discarded(file.snapshot().path))
  })

  test('when the size diverges and the bytes too, it answers the size first', async ({
    assert,
  }) => {
    const { files, storage, useCase } = subject()
    const file = storageDraft({ size: 30 })
    await files.save(file)
    storage.object(file.snapshot().path, 7, {
      head: new TextEncoder().encode('<svg'),
    })

    const result = await useCase.execute({ id: file.id })

    assert.containsSubset(result.value, { code: 'STORAGE_SIZE_MISMATCH' })
  })
})
