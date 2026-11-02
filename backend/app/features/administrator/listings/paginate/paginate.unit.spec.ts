import { LISTING_STATUS, SORT_DIRECTION } from '@aporta/shared'
import { test } from '@japa/runner'

import AdministratorListingPaginateUseCase from './paginate.use-case.ts'

import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import StorageFake from '#services/storage/storage.fake'
import {
  FailingListingRepository,
  centroIn,
  listingIn,
} from '#tests/listing-fixtures'
import { ARCHIVED_AT } from '#tests/repository-fixtures'

/** Only an archived ad is in the trash. */
function trashedAt(status: Parameters<typeof listingIn>[0]): Date | null {
  if (status === LISTING_STATUS.ARCHIVED) return ARCHIVED_AT

  return null
}

/** The ads of three states with three different ages, on the same neighborhood. */
function fresh() {
  const listings = new ListingMemoryRepository()
  const centro = centroIn(listings, new NeighborhoodMemoryRepository())
  const put = (
    slug: string,
    status: Parameters<typeof listingIn>[0],
    day: string,
  ) =>
    listings.put(
      listingIn(status, { slug, neighborhoodId: centro.id }, trashedAt(status)),
      {
        createdAt: new Date(`${day}T12:00:00.000Z`),
        updatedAt: new Date(`${day}T12:00:00.000Z`),
      },
    )
  put('nova-na-fila', LISTING_STATUS.PENDING, '2026-10-30')
  put('velha-na-fila', LISTING_STATUS.PENDING, '2026-10-01')
  put('no-ar', LISTING_STATUS.PUBLISHED, '2026-10-15')
  put('fora-do-ar', LISTING_STATUS.ARCHIVED, '2026-10-20')

  return new AdministratorListingPaginateUseCase(listings, new StorageFake())
}

test.group('administrator > listings > paginate (unit)', () => {
  test('when listing with no filter, it brings every status including the archived, newest first', async ({
    assert,
  }) => {
    const result = await fresh().execute({})

    if (result.isLeft()) return assert.fail('paginate failed')

    assert.deepEqual(
      result.value.data.map((each) => each.slug),
      ['nova-na-fila', 'fora-do-ar', 'no-ar', 'velha-na-fila'],
    )
    assert.equal(result.value.meta.total, 4)
  })

  test('when the queue is asked for, the oldest ad comes first', async ({
    assert,
  }) => {
    const result = await fresh().execute({ status: LISTING_STATUS.PENDING })

    if (result.isLeft()) return assert.fail('paginate failed')

    assert.deepEqual(
      result.value.data.map((each) => each.slug),
      ['velha-na-fila', 'nova-na-fila'],
    )
  })

  test('when the direction is explicit, it wins over the queue default', async ({
    assert,
  }) => {
    const result = await fresh().execute({
      status: LISTING_STATUS.PENDING,
      direction: SORT_DIRECTION.DESC,
    })

    if (result.isLeft()) return assert.fail('paginate failed')

    assert.deepEqual(
      result.value.data.map((each) => each.slug),
      ['nova-na-fila', 'velha-na-fila'],
    )
  })

  test('when the status is ARCHIVED, the trash is where it looks', async ({
    assert,
  }) => {
    const result = await fresh().execute({ status: LISTING_STATUS.ARCHIVED })

    if (result.isLeft()) return assert.fail('paginate failed')

    assert.deepEqual(
      result.value.data.map((each) => each.slug),
      ['fora-do-ar'],
    )
    assert.isString(result.value.data[0]?.archivedAt)
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const useCase = new AdministratorListingPaginateUseCase(
      new FailingListingRepository(),
      new StorageFake(),
    )

    const result = await useCase.execute({})

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_LISTING_PAGINATE_ERROR',
    })
  })
})
