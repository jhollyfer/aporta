import { STORAGE_MIMETYPE, UPLOAD_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import StorageFilePaginateUseCase from './paginate.use-case.ts'

import StorageMemoryRepository from '#repositories/storage/storage.memory.repository'
import StorageFake from '#services/storage/storage.fake'
import { storageDraft } from '#tests/repository-fixtures'

test.group('storage > files > paginate (unit)', () => {
  test('when listing, it brings the live ones with signed url and respects status and type', async ({
    assert,
  }) => {
    const files = new StorageMemoryRepository()
    const done = storageDraft({ originalName: 'capa.png', size: 1 })
    done.confirm(1)
    await files.save(done)
    await files.save(
      storageDraft({
        originalName: 'manual.pdf',
        mimetype: STORAGE_MIMETYPE.PDF,
      }),
    )
    const useCase = new StorageFilePaginateUseCase(files, new StorageFake())

    const all = await useCase.execute({})
    const uploaded = await useCase.execute({ status: UPLOAD_STATUS.UPLOADED })
    const pdf = await useCase.execute({ mimetype: STORAGE_MIMETYPE.PDF })

    assert.containsSubset(all.value, { meta: { total: 2, perPage: 20 } })
    assert.containsSubset(uploaded.value, {
      data: [
        { originalName: 'capa.png', url: `fake://${done.snapshot().path}` },
      ],
    })
    assert.containsSubset(pdf.value, {
      meta: { total: 1 },
      data: [{ originalName: 'manual.pdf' }],
    })
  })
})
