import { randomUUID } from 'node:crypto'

import {
  LISTING_PINS_LIMIT,
  LISTING_STATUS,
  LISTING_TYPE,
} from '@aporta/shared'
import { test } from '@japa/runner'

import StorefrontListingPinsUseCase from './pins.use-case.ts'

import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import { FailingListingRepository, listingIn } from '#tests/listing-fixtures'

function repositoryWith(neighborhoodId: string) {
  const listings = new ListingMemoryRepository()
  listings.putNeighborhood(neighborhoodId, { slug: 'centro', name: 'Centro' })

  return listings
}

test.group('storefront > listings > pins (unit)', () => {
  test('when asking for pins, it brings only the published ones, in the light shape, with the total and the limit', async ({
    assert,
  }) => {
    const neighborhoodId = randomUUID()
    const listings = repositoryWith(neighborhoodId)
    listings.put(
      listingIn(LISTING_STATUS.PUBLISHED, {
        slug: 'quarto',
        type: LISTING_TYPE.ROOM,
        neighborhoodId,
        priceMonthly: 500,
        lat: -4.38,
        lng: -70.03,
      }),
    )
    listings.put(
      listingIn(LISTING_STATUS.DRAFT, { slug: 'rascunho', neighborhoodId }),
    )
    const useCase = new StorefrontListingPinsUseCase(listings)

    const result = await useCase.execute({})

    if (result.isLeft()) throw result.value
    assert.containsSubset(result.value, {
      meta: { total: 1, limit: LISTING_PINS_LIMIT },
      data: [
        {
          slug: 'quarto',
          type: 'ROOM',
          lat: -4.38,
          lng: -70.03,
          price: { monthly: 500, daily: null },
        },
      ],
    })
    const [pin] = result.value.data
    // The allowlist: no owner contact, no photos, no status.
    assert.sameMembers(Object.keys(pin ?? {}), [
      'id',
      'slug',
      'type',
      'lat',
      'lng',
      'price',
    ])
  })

  test('when the payload has filters and a window, it hands them to the repository', async ({
    assert,
  }) => {
    const neighborhoodId = randomUUID()
    const listings = repositoryWith(neighborhoodId)
    listings.put(
      listingIn(LISTING_STATUS.PUBLISHED, {
        slug: 'dentro',
        neighborhoodId,
        lat: -4.38,
        lng: -70.03,
      }),
    )
    listings.put(
      listingIn(LISTING_STATUS.PUBLISHED, {
        slug: 'fora',
        neighborhoodId,
        lat: -3,
        lng: -60,
      }),
    )
    const useCase = new StorefrontListingPinsUseCase(listings)

    const result = await useCase.execute({
      minLng: -70.1,
      minLat: -4.4,
      maxLng: -70,
      maxLat: -4.3,
      type: LISTING_TYPE.KITNET,
    })

    assert.containsSubset(result.value, {
      meta: { total: 1 },
      data: [{ slug: 'dentro' }],
    })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const useCase = new StorefrontListingPinsUseCase(
      new FailingListingRepository(),
    )

    const result = await useCase.execute({})

    assert.containsSubset(result.value, {
      status: 500,
      code: 'STOREFRONT_LISTING_PINS_ERROR',
    })
  })
})
