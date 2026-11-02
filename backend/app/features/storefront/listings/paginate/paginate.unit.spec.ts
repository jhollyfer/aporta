import { randomUUID } from 'node:crypto'

import { LISTING_STATUS, LISTING_TYPE } from '@aporta/shared'
import { test } from '@japa/runner'

import StorefrontListingPaginateUseCase from './paginate.use-case.ts'

import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import ListingRepository from '#repositories/listing/listing.repository'
import { listingIn } from '#tests/listing-fixtures'

function repositoryWith(neighborhoodId: string) {
  const listings = new ListingMemoryRepository()
  listings.putNeighborhood(neighborhoodId, { slug: 'centro', name: 'Centro' })

  return listings
}

test.group('storefront > listings > paginate (unit)', () => {
  test('when listing, it brings only the published ones, presented, newest first', async ({
    assert,
  }) => {
    const neighborhoodId = randomUUID()
    const listings = repositoryWith(neighborhoodId)
    listings.put(
      listingIn(LISTING_STATUS.PUBLISHED, {
        slug: 'antigo',
        neighborhoodId,
      }),
      {
        createdAt: new Date('2026-01-01T12:00:00.000Z'),
        updatedAt: new Date('2026-01-01T12:00:00.000Z'),
      },
    )
    listings.put(
      listingIn(LISTING_STATUS.PUBLISHED, { slug: 'recente', neighborhoodId }),
      {
        createdAt: new Date('2026-02-01T12:00:00.000Z'),
        updatedAt: new Date('2026-02-01T12:00:00.000Z'),
      },
    )
    listings.put(
      listingIn(LISTING_STATUS.DRAFT, { slug: 'rascunho', neighborhoodId }),
    )
    const useCase = new StorefrontListingPaginateUseCase(listings)

    const result = await useCase.execute({})

    assert.containsSubset(result.value, {
      meta: { total: 2, perPage: 20, currentPage: 1 },
      data: [
        { slug: 'recente', neighborhood: { slug: 'centro', name: 'Centro' } },
        { slug: 'antigo' },
      ],
    })
  })

  test('when the payload has filters, it hands them to the repository', async ({
    assert,
  }) => {
    const neighborhoodId = randomUUID()
    const listings = repositoryWith(neighborhoodId)
    listings.put(
      listingIn(LISTING_STATUS.PUBLISHED, {
        slug: 'kitnet',
        neighborhoodId,
        priceMonthly: 700,
      }),
    )
    listings.put(
      listingIn(LISTING_STATUS.PUBLISHED, {
        slug: 'quarto',
        type: LISTING_TYPE.ROOM,
        neighborhoodId,
        priceMonthly: 500,
      }),
    )
    const useCase = new StorefrontListingPaginateUseCase(listings)

    const kitnets = await useCase.execute({ type: LISTING_TYPE.KITNET })
    const range = await useCase.execute({
      minPrice: 450,
      maxPrice: 600,
      sort: 'price',
      direction: 'asc',
    })

    assert.containsSubset(kitnets.value, { data: [{ slug: 'kitnet' }] })
    assert.containsSubset(range.value, {
      meta: { total: 1 },
      data: [{ slug: 'quarto' }],
    })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    class FailingListingRepository extends ListingRepository {
      findPublishedRecordBySlug(): never {
        throw new Error('database down')
      }

      paginatePublished(): never {
        throw new Error('database down')
      }
    }
    const useCase = new StorefrontListingPaginateUseCase(
      new FailingListingRepository(),
    )

    const result = await useCase.execute({})

    assert.containsSubset(result.value, {
      status: 500,
      code: 'STOREFRONT_LISTING_PAGINATE_ERROR',
    })
  })
})
