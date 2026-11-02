import { randomUUID } from 'node:crypto'

import { PLACE_CATEGORY } from '@aporta/shared'
import { test } from '@japa/runner'

import StorefrontPlacePaginateUseCase from './paginate.use-case.ts'

import PlaceMemoryRepository from '#repositories/place/place.memory.repository'
import PlaceRepository from '#repositories/place/place.repository'
import { placeDraft } from '#tests/place-fixtures'

test.group('storefront > places > paginate (unit)', () => {
  test('when listing, it brings the places by name and narrows by category', async ({
    assert,
  }) => {
    const neighborhoodId = randomUUID()
    const places = new PlaceMemoryRepository()
    places.putNeighborhood(neighborhoodId, { slug: 'centro', name: 'Centro' })
    places.put(placeDraft({ name: 'Tacacá', neighborhoodId }))
    places.put(
      placeDraft({
        name: 'Festival',
        category: PLACE_CATEGORY.EVENT,
        date: '2027-06-26',
        neighborhoodId,
      }),
    )
    const useCase = new StorefrontPlacePaginateUseCase(places)

    const all = await useCase.execute({})
    const events = await useCase.execute({ category: PLACE_CATEGORY.EVENT })

    assert.containsSubset(all.value, {
      meta: { total: 2 },
      data: [{ name: 'Festival' }, { name: 'Tacacá' }],
    })
    assert.containsSubset(events.value, {
      meta: { total: 1 },
      data: [
        {
          name: 'Festival',
          date: '2027-06-26',
          neighborhood: { slug: 'centro', name: 'Centro' },
        },
      ],
    })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    class FailingPlaceRepository extends PlaceRepository {
      paginate(): never {
        throw new Error('database down')
      }
    }
    const useCase = new StorefrontPlacePaginateUseCase(
      new FailingPlaceRepository(),
    )

    const result = await useCase.execute({})

    assert.containsSubset(result.value, {
      status: 500,
      code: 'STOREFRONT_PLACE_PAGINATE_ERROR',
    })
  })
})
