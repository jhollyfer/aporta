import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import StorageFileDownloadUseCase from './download.use-case.ts'

import StorageMemoryRepository from '#repositories/storage/storage.memory.repository'
import StorageFake from '#services/storage/storage.fake'
import { storageDraft } from '#tests/repository-fixtures'

test.group('storage > files > download (unit)', () => {
  test('when the file arrives authorized, it returns the signed download URL', async ({
    assert,
  }) => {
    const files = new StorageMemoryRepository()
    const storage = storageDraft()
    await files.save(storage)
    const useCase = new StorageFileDownloadUseCase(files, new StorageFake())

    const result = await useCase.execute({ storageId: storage.id })

    assert.equal(result.value, `fake://download/${storage.snapshot().path}`)
  })

  test('when the file is gone by the time it is read again, answers 404 STORAGE_NOT_FOUND', async ({
    assert,
  }) => {
    const useCase = new StorageFileDownloadUseCase(
      new StorageMemoryRepository(),
      new StorageFake(),
    )

    const result = await useCase.execute({ storageId: randomUUID() })

    assert.isTrue(result.isLeft())
    assert.containSubset(result.value, {
      status: 404,
      code: 'STORAGE_NOT_FOUND',
    })
  })
})
