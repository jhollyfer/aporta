import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import StorageFileShowUseCase from './show.use-case.ts'

import StorageMemoryRepository from '#repositories/storage/storage.memory.repository'
import StorageFake from '#services/storage/storage.fake'
import { ARCHIVED_AT, storageDraft } from '#tests/repository-fixtures'

test.group('storage > files > show (unit)', () => {
  test('when live, it returns the file with the signed url; cancelled or missing is 404', async ({
    assert,
  }) => {
    const files = new StorageMemoryRepository()
    const useCase = new StorageFileShowUseCase(files, new StorageFake())
    const alive = storageDraft()
    const cancelled = storageDraft()
    cancelled.cancel(ARCHIVED_AT)
    await files.save(alive)
    await files.save(cancelled)

    const found = await useCase.execute({ id: alive.id })

    assert.containsSubset(found.value, {
      id: alive.id,
      deletedAt: null,
      url: `fake://${alive.snapshot().path}`,
    })

    for (const id of [cancelled.id, randomUUID()]) {
      const result = await useCase.execute({ id })

      assert.containsSubset(result.value, {
        status: 404,
        code: 'STORAGE_NOT_FOUND',
      })
    }
  })
})
