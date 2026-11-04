import { randomUUID } from 'node:crypto'

import { LISTING_STATUS, PHOTO_ENVIRONMENT } from '@aporta/shared'
import { test } from '@japa/runner'

import OwnerListingPhotoReorderUseCase from './reorder.use-case.ts'

import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import StorageFake from '#services/storage/storage.fake'
import {
  FailingListingRepository,
  centroIn,
  listingIn,
} from '#tests/listing-fixtures'

/** A refused ad (`DRAFT`) with three photos: the status must survive the reorder. */
function subject() {
  const listings = new ListingMemoryRepository()
  const neighborhoods = new NeighborhoodMemoryRepository()
  const centro = centroIn(listings, neighborhoods)
  const ids = [randomUUID(), randomUUID(), randomUUID()]
  const entity = listingIn(LISTING_STATUS.DRAFT, {
    slug: 'com-fotos',
    neighborhoodId: centro.id,
    photos: ids.map((id) => ({
      id,
      environment: PHOTO_ENVIRONMENT.LIVING,
      storageId: null,
    })),
  })
  listings.put(entity)
  const useCase = new OwnerListingPhotoReorderUseCase(
    listings,
    new StorageFake(),
  )

  return { listings, entity, ids, useCase }
}

test.group('owner > listing-photos > reorder (unit)', () => {
  test('when the order is exactly the gallery, it is saved and the whole ad comes back in that order', async ({
    assert,
  }) => {
    const { entity, ids, listings, useCase } = subject()
    const wanted = [ids[2] ?? '', ids[0] ?? '', ids[1] ?? '']

    const result = await useCase.execute({ id: entity.id, photoIds: wanted })

    if (result.isLeft()) return assert.fail(result.value.message)
    assert.deepEqual(
      result.value.photos.map((photo) => photo.id),
      wanted,
    )
    assert.equal(result.value.status, LISTING_STATUS.DRAFT)
    const stored = await listings.findById(entity.id)
    assert.deepEqual(
      stored?.snapshot().photos.map((photo) => photo.id),
      wanted,
    )
  })

  test('when the order misses, repeats or adds a photo, it answers 422 LISTING_PHOTOS_ORDER_INVALID and saves nothing', async ({
    assert,
  }) => {
    const { entity, ids, listings, useCase } = subject()

    for (const photoIds of [
      [ids[0] ?? '', ids[1] ?? ''],
      [ids[0] ?? '', ids[0] ?? '', ids[1] ?? ''],
      [...ids, randomUUID()],
      [ids[0] ?? '', ids[1] ?? '', randomUUID()],
    ]) {
      const result = await useCase.execute({ id: entity.id, photoIds })

      assert.containsSubset(result.value, {
        status: 422,
        code: 'LISTING_PHOTOS_ORDER_INVALID',
      })
    }
    const stored = await listings.findById(entity.id)
    assert.deepEqual(
      stored?.snapshot().photos.map((photo) => photo.id),
      ids,
    )
  })

  test('when the ad does not exist, it answers 404 LISTING_NOT_FOUND', ({
    assert,
  }) => {
    const { useCase } = subject()

    return useCase
      .execute({ id: randomUUID(), photoIds: [randomUUID()] })
      .then((result) => {
        assert.containsSubset(result.value, {
          status: 404,
          code: 'LISTING_NOT_FOUND',
        })
      })
  })

  test('when the repository fails, it answers the module 500 code', async ({
    assert,
  }) => {
    const useCase = new OwnerListingPhotoReorderUseCase(
      new FailingListingRepository(),
      new StorageFake(),
    )

    const result = await useCase.execute({
      id: randomUUID(),
      photoIds: [randomUUID()],
    })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'OWNER_LISTING_PHOTO_REORDER_ERROR',
    })
  })
})
