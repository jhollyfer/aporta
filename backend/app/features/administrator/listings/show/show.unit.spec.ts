import { randomUUID } from 'node:crypto'

import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import AdministratorListingShowUseCase from './show.use-case.ts'

import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import StorageFake from '#services/storage/storage.fake'
import {
  FailingListingRepository,
  centroIn,
  listingIn,
} from '#tests/listing-fixtures'
import { ARCHIVED_AT } from '#tests/repository-fixtures'

test.group('administrator > listings > show (unit)', () => {
  test('when the ad is archived, the staff still reads it, with the account and when it left', async ({
    assert,
  }) => {
    const listings = new ListingMemoryRepository()
    const centro = centroIn(listings, new NeighborhoodMemoryRepository())
    const ownerId = randomUUID()
    listings.putAccount({
      id: ownerId,
      name: 'Dona Maria',
      email: 'maria@mail.com',
      verifiedAt: new Date('2026-10-01T12:00:00.000Z'),
    })
    const entity = listingIn(
      LISTING_STATUS.ARCHIVED,
      { slug: 'saiu', neighborhoodId: centro.id, ownerId },
      ARCHIVED_AT,
    )
    listings.put(entity)
    const useCase = new AdministratorListingShowUseCase(
      listings,
      new StorageFake(),
    )

    const result = await useCase.execute({ id: entity.id })

    if (result.isLeft()) return assert.fail('show failed')

    assert.equal(result.value.status, LISTING_STATUS.ARCHIVED)
    assert.isString(result.value.archivedAt)
    assert.deepEqual(result.value.account, {
      id: ownerId,
      name: 'Dona Maria',
      email: 'maria@mail.com',
      verified: true,
    })
    assert.isTrue(result.value.owner.verified)
  })

  test('when the id is not an ad, it answers 404 LISTING_NOT_FOUND', async ({
    assert,
  }) => {
    const useCase = new AdministratorListingShowUseCase(
      new ListingMemoryRepository(),
      new StorageFake(),
    )

    const result = await useCase.execute({ id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 404,
      code: 'LISTING_NOT_FOUND',
    })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const useCase = new AdministratorListingShowUseCase(
      new FailingListingRepository(),
      new StorageFake(),
    )

    const result = await useCase.execute({ id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_LISTING_SHOW_ERROR',
    })
  })
})
