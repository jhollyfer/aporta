import { randomUUID } from 'node:crypto'

import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import OwnerListingArchiveUseCase from './archive.use-case.ts'

import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import ClockFake from '#services/clock/clock.fake'
import {
  FailingListingRepository,
  listingIn,
  centroIn,
} from '#tests/listing-fixtures'

/** The two memory repositories, agreeing on one neighborhood (`centro`). */
function fresh() {
  const listings = new ListingMemoryRepository()
  const neighborhoods = new NeighborhoodMemoryRepository()
  const centro = centroIn(listings, neighborhoods)

  return { listings, neighborhoods, centro }
}

test.group('owner > listings > archive (unit)', () => {
  test('when archived, the ad becomes ARCHIVED and goes to the trash at the clock instant, and no read finds it', async ({
    assert,
  }) => {
    const { centro, listings } = fresh()
    const entity = listingIn(LISTING_STATUS.PUBLISHED, {
      slug: 'saindo',
      neighborhoodId: centro.id,
    })
    listings.put(entity)
    const useCase = new OwnerListingArchiveUseCase(listings, new ClockFake())

    const result = await useCase.execute({ id: entity.id })

    assert.isTrue(result.isRight())
    assert.isNull(await listings.findById(entity.id))
    assert.isNull(await listings.findPublishedRecordBySlug('saindo'))
  })

  test('when the ad is already out (trashed), it answers 404 like any ad that is not there', async ({
    assert,
  }) => {
    const { centro, listings } = fresh()
    const entity = listingIn(
      LISTING_STATUS.ARCHIVED,
      { slug: 'ja-saiu', neighborhoodId: centro.id },
      ClockFake.INSTANT,
    )
    listings.put(entity)
    const useCase = new OwnerListingArchiveUseCase(listings, new ClockFake())

    const result = await useCase.execute({ id: entity.id })

    assert.containsSubset(result.value, {
      status: 404,
      code: 'LISTING_NOT_FOUND',
    })
  })

  test('when the ad does not exist, it answers 404 LISTING_NOT_FOUND', async ({
    assert,
  }) => {
    const { listings } = fresh()
    const useCase = new OwnerListingArchiveUseCase(listings, new ClockFake())

    const result = await useCase.execute({ id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 404,
      code: 'LISTING_NOT_FOUND',
    })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const useCase = new OwnerListingArchiveUseCase(
      new FailingListingRepository(),
      new ClockFake(),
    )

    const result = await useCase.execute({ id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'OWNER_LISTING_ARCHIVE_ERROR',
    })
  })
})
