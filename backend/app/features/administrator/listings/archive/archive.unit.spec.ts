import { randomUUID } from 'node:crypto'

import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import AdministratorListingArchiveUseCase from './archive.use-case.ts'

import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import ClockFake from '#services/clock/clock.fake'
import {
  FailingListingRepository,
  centroIn,
  listingIn,
} from '#tests/listing-fixtures'
import { ARCHIVED_AT } from '#tests/repository-fixtures'

function fresh() {
  const listings = new ListingMemoryRepository()
  const centro = centroIn(listings, new NeighborhoodMemoryRepository())

  return {
    listings,
    centro,
    useCase: new AdministratorListingArchiveUseCase(listings, new ClockFake()),
  }
}

test.group('administrator > listings > archive (unit)', () => {
  test('when archived, any ad in any state leaves the air at the clock instant', async ({
    assert,
  }) => {
    for (const status of [
      LISTING_STATUS.DRAFT,
      LISTING_STATUS.PENDING,
      LISTING_STATUS.PUBLISHED,
    ]) {
      const { listings, centro, useCase } = fresh()
      const entity = listingIn(status, {
        slug: 'saindo',
        neighborhoodId: centro.id,
      })
      listings.put(entity)

      const result = await useCase.execute({ id: entity.id })

      assert.isTrue(result.isRight())
      const stored = (await listings.findAnyById(entity.id))?.snapshot()
      assert.equal(stored?.status, LISTING_STATUS.ARCHIVED)
      assert.deepEqual(stored?.deletedAt, ClockFake.INSTANT)
      assert.isNull(await listings.findPublishedRecordBySlug('saindo'))
    }
  })

  test('when the ad was already archived, it answers 409 and not 404', async ({
    assert,
  }) => {
    const { listings, centro, useCase } = fresh()
    const entity = listingIn(
      LISTING_STATUS.ARCHIVED,
      { slug: 'ja-saiu', neighborhoodId: centro.id },
      ARCHIVED_AT,
    )
    listings.put(entity)

    const result = await useCase.execute({ id: entity.id })

    assert.containsSubset(result.value, {
      status: 409,
      code: 'LISTING_ALREADY_ARCHIVED',
    })
  })

  test('when the ad does not exist, it answers 404 LISTING_NOT_FOUND', async ({
    assert,
  }) => {
    const { useCase } = fresh()

    const result = await useCase.execute({ id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 404,
      code: 'LISTING_NOT_FOUND',
    })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const useCase = new AdministratorListingArchiveUseCase(
      new FailingListingRepository(),
      new ClockFake(),
    )

    const result = await useCase.execute({ id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_LISTING_ARCHIVE_ERROR',
    })
  })
})
