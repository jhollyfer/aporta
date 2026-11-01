import { STORAGE_MIMETYPE, UPLOAD_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import StorageFileCreateUseCase from './create.use-case.ts'

import StorageMemoryRepository from '#repositories/storage/storage.memory.repository'
import IdGeneratorFake from '#services/id-generator/id-generator.fake'
import { PART_SIZE } from '#services/multipart/multipart.contract'
import MultipartFake from '#services/multipart/multipart.fake'
import StorageFake from '#services/storage/storage.fake'
import { actorDraft } from '#tests/user-fixtures'

const ACTOR = actorDraft({ id: '00000000-0000-4000-8000-0000000000b2' })
const FIRST_ID = '00000000-0000-4000-8000-000000000001'

function subject() {
  const files = new StorageMemoryRepository()
  const multipart = new MultipartFake()
  const useCase = new StorageFileCreateUseCase(
    files,
    new StorageFake(),
    multipart,
    new IdGeneratorFake(),
  )
  return { files, multipart, useCase }
}

test.group('storage > files > create (unit)', () => {
  test('when it fits in one part, it opens PENDING with a single URL and no uploadId', async ({
    assert,
  }) => {
    const { files, multipart, useCase } = subject()

    const result = await useCase.execute({
      actor: ACTOR,
      fileName: 'foto.png',
      mimetype: STORAGE_MIMETYPE.PNG,
      size: 1024,
    })

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.equal(result.value.totalParts, 1)
    assert.deepEqual(multipart.signed(), [
      { partNumber: 1, contentLength: 1024 },
    ])
    assert.isNull(result.value.uploadId)
    assert.lengthOf(result.value.parts, 1)
    assert.deepEqual(result.value.uploaded, [])
    assert.containsSubset(result.value.storage, {
      id: FIRST_ID,
      originalName: 'foto.png',
      status: UPLOAD_STATUS.PENDING,
    })
    assert.notProperty(result.value.storage, 'url')
    assert.notProperty(result.value.storage, 'deletedAt')
    const stored = await files.findById(FIRST_ID)
    assert.equal(stored?.snapshot().status, UPLOAD_STATUS.PENDING)
    // No upload is anonymous: the file belongs to the actor from the create.
    assert.equal(stored?.snapshot().ownerId, ACTOR.id)
  })

  test('when it exceeds one part, it opens the multipart and signs the parts', async ({
    assert,
  }) => {
    const { multipart, useCase } = subject()

    const result = await useCase.execute({
      actor: ACTOR,
      fileName: 'video.mp4',
      mimetype: STORAGE_MIMETYPE.PDF,
      size: PART_SIZE * 2 + 1,
    })

    if (result.isLeft()) return assert.fail(result.value.message)

    // The last part carries what is left, and its length is what the signature pins.
    assert.deepEqual(
      multipart.signed().map((part) => part.contentLength),
      [PART_SIZE, PART_SIZE, 1],
    )
    assert.equal(result.value.uploadId, 'upload-1')
    assert.equal(result.value.totalParts, 3)
    assert.deepEqual(
      result.value.parts.map((part) => part.partNumber),
      [1, 2, 3],
    )
  })

  test('when the multipart fails to open, it answers 500 STORAGE_FILE_CREATE_ERROR and saves no row', async ({
    assert,
  }) => {
    const { files, multipart, useCase } = subject()
    multipart.failWith(new Error('bucket down'))

    const result = await useCase.execute({
      actor: ACTOR,
      fileName: 'video.mp4',
      mimetype: STORAGE_MIMETYPE.PDF,
      size: PART_SIZE * 2,
    })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'STORAGE_FILE_CREATE_ERROR',
    })
    assert.isNull(await files.findById(FIRST_ID))
  })

  test('when the single URL cannot be signed, it answers 500 STORAGE_FILE_CREATE_ERROR', async ({
    assert,
  }) => {
    const { multipart, useCase } = subject()
    multipart.failWith(new Error('signer down'))

    const result = await useCase.execute({
      actor: ACTOR,
      fileName: 'foto.png',
      mimetype: STORAGE_MIMETYPE.PNG,
      size: 1024,
    })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'STORAGE_FILE_CREATE_ERROR',
    })
  })
})
