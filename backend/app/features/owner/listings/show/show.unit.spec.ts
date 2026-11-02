import { randomUUID } from 'node:crypto'

import { LISTING_STATUS, PHOTO_ENVIRONMENT } from '@aporta/shared'
import { test } from '@japa/runner'

import OwnerListingShowUseCase from './show.use-case.ts'

import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import StorageFake from '#services/storage/storage.fake'
import {
  FailingListingRepository,
  listingIn,
  centroIn,
} from '#tests/listing-fixtures'
import { storageFile } from '#tests/repository-fixtures'

/** The two memory repositories, agreeing on one neighborhood (`centro`). */
function fresh() {
  const listings = new ListingMemoryRepository()
  const neighborhoods = new NeighborhoodMemoryRepository()
  const centro = centroIn(listings, neighborhoods)

  return { listings, neighborhoods, centro }
}

test.group('owner > listings > show (unit)', () => {
  test('when the ad exists, it answers the owner shape: status, signed url and the file key of each photo', async ({
    assert,
  }) => {
    const { centro, listings } = fresh()
    const file = storageFile()
    listings.putFile(file)
    const entity = listingIn(LISTING_STATUS.PENDING, {
      slug: 'minha',
      neighborhoodId: centro.id,
      photos: [
        {
          id: randomUUID(),
          environment: PHOTO_ENVIRONMENT.FACADE,
          storageId: file.id,
        },
        {
          id: randomUUID(),
          environment: PHOTO_ENVIRONMENT.KITCHEN,
          storageId: null,
        },
      ],
    })
    listings.put(entity)
    const useCase = new OwnerListingShowUseCase(listings, new StorageFake())

    const result = await useCase.execute({ id: entity.id })

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.equal(result.value.status, LISTING_STATUS.PENDING)
    assert.deepEqual(
      result.value.photos.map((photo) => [photo.storageId, photo.url]),
      [
        [file.id, `fake://${file.path}`],
        [null, null],
      ],
    )
    // Never the account, never the trash.
    assert.notProperty(result.value, 'ownerId')
    assert.notProperty(result.value, 'deletedAt')
  })

  test('when the ad does not exist, it answers 404 LISTING_NOT_FOUND', async ({
    assert,
  }) => {
    const { listings } = fresh()
    const useCase = new OwnerListingShowUseCase(listings, new StorageFake())

    const result = await useCase.execute({ id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 404,
      code: 'LISTING_NOT_FOUND',
    })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const useCase = new OwnerListingShowUseCase(
      new FailingListingRepository(),
      new StorageFake(),
    )

    const result = await useCase.execute({ id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'OWNER_LISTING_SHOW_ERROR',
    })
  })
})
