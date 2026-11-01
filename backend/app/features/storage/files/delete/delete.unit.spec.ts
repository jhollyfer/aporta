import { randomUUID } from 'node:crypto'

import { LOCALE, TRASHED_MODE } from '@aporta/shared'
import { test } from '@japa/runner'

import StorageFileDeleteUseCase from './delete.use-case.ts'

import Translation from '#core/translation'
import StorageMemoryRepository from '#repositories/storage/storage.memory.repository'
import { STORAGE_REFERENCE } from '#repositories/storage/storage.repository'
import ClockFake from '#services/clock/clock.fake'
import MultipartFake from '#services/multipart/multipart.fake'
import StorageFake from '#services/storage/storage.fake'
import { readLang } from '#tests/lang-fixtures'
import { storageDraft } from '#tests/repository-fixtures'

function subject() {
  const files = new StorageMemoryRepository()
  const storage = new StorageFake()
  const multipart = new MultipartFake()
  const useCase = new StorageFileDeleteUseCase(
    files,
    storage,
    multipart,
    new ClockFake(),
  )
  return { files, storage, multipart, useCase }
}

test.group('storage > files > delete (unit)', () => {
  test('when it is a PENDING multipart, it aborts and marks cancelled; repeating is success', async ({
    assert,
  }) => {
    const { files, multipart, useCase } = subject()
    const file = storageDraft({ uploadId: 'upload-x' })
    await files.save(file)

    const first = await useCase.execute({ id: file.id })
    const again = await useCase.execute({ id: file.id })

    assert.isTrue(first.isRight())
    assert.isTrue(again.isRight())
    assert.isTrue(multipart.aborted('upload-x'))
    const stored = await files.findById(file.id, TRASHED_MODE.ONLY)
    assert.equal(
      stored?.snapshot().deletedAt?.toISOString(),
      ClockFake.INSTANT.toISOString(),
    )
  })

  test('when it is an orphan UPLOADED, it deletes binary and row', async ({
    assert,
  }) => {
    const { files, storage, useCase } = subject()
    const file = storageDraft({ size: 1 })
    file.confirm(1)
    await files.save(file)

    const result = await useCase.execute({ id: file.id })

    assert.isTrue(result.isRight())
    assert.isTrue(storage.discarded(file.snapshot().path))
    assert.isNull(await files.findById(file.id, TRASHED_MODE.WITH))
  })

  test('when in use, it answers 409 STORAGE_IN_USE saying where, and does not delete', async ({
    assert,
  }) => {
    const { files, useCase } = subject()
    const file = storageDraft({ size: 1 })
    file.confirm(1)
    await files.save(file)
    files.reference(file.id, STORAGE_REFERENCE.USER_AVATAR)

    const result = await useCase.execute({ id: file.id })

    assert.containsSubset(result.value, {
      status: 409,
      code: 'STORAGE_IN_USE',
      errors: {
        id: Translation.t('fields.STORAGE_IN_USE', {
          references: Translation.t('references.USER_AVATAR'),
        }),
      },
    })
    assert.isNotNull(await files.findById(file.id))
  })

  test('when cancelling a PENDING and the bucket fails, it answers 500 and keeps the row', async ({
    assert,
  }) => {
    const { files, storage, useCase } = subject()
    const file = storageDraft({ size: 1 })
    await files.save(file)
    storage.failWith(new Error('bucket down'))

    const result = await useCase.execute({ id: file.id })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'STORAGE_FILE_DELETE_ERROR',
    })
    assert.isNotNull(await files.findById(file.id))
  })

  test('when cancelling a PENDING whose object is not in the bucket, it is success', async ({
    assert,
  }) => {
    const { files, useCase } = subject()
    const file = storageDraft({ size: 1 })
    await files.save(file)

    const result = await useCase.execute({ id: file.id })

    assert.isTrue(result.isRight())
  })

  test('when listing storage references, every one has a translated label', async ({
    assert,
  }) => {
    const labels = await readLang(LOCALE.PT_BR, 'references')

    assert.deepEqual(
      [...labels.keys()].sort(),
      Object.values(STORAGE_REFERENCE).sort(),
    )
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

  test('when aborting the multipart fails, it answers 500 STORAGE_FILE_DELETE_ERROR and keeps the row', async ({
    assert,
  }) => {
    const { files, multipart, useCase } = subject()
    const file = storageDraft({ size: 20, uploadId: 'upload-x' })
    await files.save(file)
    multipart.failWith(new Error('bucket down'))

    const result = await useCase.execute({ id: file.id })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'STORAGE_FILE_DELETE_ERROR',
    })
    assert.isNotNull(await files.findById(file.id))
  })
})
