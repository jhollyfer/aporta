import { randomUUID } from 'node:crypto'

import { LISTING_STATUS, PHOTO_ENVIRONMENT, TRASHED_MODE } from '@aporta/shared'
import { test } from '@japa/runner'

import OwnerListingPhotoDeleteUseCase from './delete.use-case.ts'

import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import StorageMemoryRepository from '#repositories/storage/storage.memory.repository'
import { STORAGE_REFERENCE } from '#repositories/storage/storage.repository'
import StorageFake from '#services/storage/storage.fake'
import {
  FailingListingRepository,
  centroIn,
  listingIn,
} from '#tests/listing-fixtures'
import { storageDraft } from '#tests/repository-fixtures'

/** An ad with two photos, each over a finished file that has its object in the fake bucket. */
async function subject() {
  const listings = new ListingMemoryRepository()
  const neighborhoods = new NeighborhoodMemoryRepository()
  const centro = centroIn(listings, neighborhoods)
  const storages = new StorageMemoryRepository()
  const bucket = new StorageFake()

  async function file() {
    const draft = storageDraft({ size: 5 })
    draft.confirm(5)
    await storages.save(draft)
    bucket.object(draft.snapshot().path, 5)

    return draft
  }

  const first = await file()
  const second = await file()
  const entity = listingIn(LISTING_STATUS.PENDING, {
    slug: 'com-fotos',
    neighborhoodId: centro.id,
    photos: [
      {
        id: randomUUID(),
        environment: PHOTO_ENVIRONMENT.FACADE,
        storageId: first.id,
      },
      {
        id: randomUUID(),
        environment: PHOTO_ENVIRONMENT.KITCHEN,
        storageId: second.id,
      },
    ],
  })
  listings.put(entity)
  const useCase = new OwnerListingPhotoDeleteUseCase(listings, storages, bucket)
  const [firstPhoto, secondPhoto] = entity.snapshot().photos

  return {
    listings,
    storages,
    bucket,
    entity,
    first,
    second,
    firstPhoto,
    secondPhoto,
    useCase,
  }
}

test.group('owner > listing-photos > delete (unit)', () => {
  test('when the photo is removed, the others move up and the orphan file leaves the bucket', async ({
    assert,
  }) => {
    const {
      entity,
      first,
      firstPhoto,
      secondPhoto,
      listings,
      storages,
      bucket,
      useCase,
    } = await subject()

    const result = await useCase.execute({
      id: entity.id,
      photoId: firstPhoto?.id ?? '',
    })

    assert.isTrue(result.isRight())
    const stored = await listings.findById(entity.id)
    assert.deepEqual(
      stored?.snapshot().photos.map((photo) => photo.id),
      [secondPhoto?.id],
    )
    assert.isTrue(bucket.discarded(first.snapshot().path))
    assert.isNull(await storages.findById(first.id, TRASHED_MODE.WITH))
  })

  test('when another record still references the file, the photo goes but the binary stays', async ({
    assert,
  }) => {
    const { entity, first, firstPhoto, storages, bucket, useCase } =
      await subject()
    storages.reference(first.id, STORAGE_REFERENCE.LISTING_PHOTO)

    const result = await useCase.execute({
      id: entity.id,
      photoId: firstPhoto?.id ?? '',
    })

    assert.isTrue(result.isRight())
    assert.isFalse(bucket.discarded(first.snapshot().path))
    assert.isNotNull(await storages.findById(first.id, TRASHED_MODE.WITH))
  })

  test('when the bucket fails, the photo stays removed and the answer is still a success', async ({
    assert,
  }) => {
    const { entity, firstPhoto, listings, bucket, useCase } = await subject()
    bucket.failWith(new Error('bucket down'))

    const result = await useCase.execute({
      id: entity.id,
      photoId: firstPhoto?.id ?? '',
    })

    assert.isTrue(result.isRight())
    const stored = await listings.findById(entity.id)
    assert.lengthOf(stored?.snapshot().photos ?? [], 1)
  })

  test('when the photo is not in the ad, it answers 404 LISTING_PHOTO_NOT_FOUND and keeps the gallery', async ({
    assert,
  }) => {
    const { entity, listings, useCase } = await subject()

    const result = await useCase.execute({
      id: entity.id,
      photoId: randomUUID(),
    })

    assert.containsSubset(result.value, {
      status: 404,
      code: 'LISTING_PHOTO_NOT_FOUND',
    })
    const stored = await listings.findById(entity.id)
    assert.lengthOf(stored?.snapshot().photos ?? [], 2)
  })

  test('when the ad does not exist, it answers 404 LISTING_NOT_FOUND', async ({
    assert,
  }) => {
    const { useCase } = await subject()

    const result = await useCase.execute({
      id: randomUUID(),
      photoId: randomUUID(),
    })

    assert.containsSubset(result.value, {
      status: 404,
      code: 'LISTING_NOT_FOUND',
    })
  })

  test('when the repository fails, it answers the module 500 code', async ({
    assert,
  }) => {
    const useCase = new OwnerListingPhotoDeleteUseCase(
      new FailingListingRepository(),
      new StorageMemoryRepository(),
      new StorageFake(),
    )

    const result = await useCase.execute({
      id: randomUUID(),
      photoId: randomUUID(),
    })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'OWNER_LISTING_PHOTO_DELETE_ERROR',
    })
  })
})
