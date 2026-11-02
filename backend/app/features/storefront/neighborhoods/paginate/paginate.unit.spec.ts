import { test } from '@japa/runner'

import StorefrontNeighborhoodPaginateUseCase from './paginate.use-case.ts'

import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import NeighborhoodRepository from '#repositories/neighborhood/neighborhood.repository'
import { neighborhoodDraft } from '#tests/neighborhood-fixtures'

test.group('storefront > neighborhoods > paginate (unit)', () => {
  test('when listing, it brings the neighborhoods in alphabetical order with the slug and the center only', async ({
    assert,
  }) => {
    const neighborhoods = new NeighborhoodMemoryRepository()
    neighborhoods.put(neighborhoodDraft({ slug: 'colonia', name: 'Colônia' }))
    neighborhoods.put(neighborhoodDraft({ slug: 'centro', name: 'Centro' }))
    const useCase = new StorefrontNeighborhoodPaginateUseCase(neighborhoods)

    const result = await useCase.execute({})

    assert.deepEqual(result.value, {
      meta: {
        total: 2,
        perPage: 20,
        currentPage: 1,
        lastPage: 1,
        firstPage: 1,
        firstPageUrl: '/?page=1',
        lastPageUrl: '/?page=1',
        nextPageUrl: null,
        previousPageUrl: null,
      },
      data: [
        { slug: 'centro', name: 'Centro', lat: -4.3775, lng: -70.0312 },
        { slug: 'colonia', name: 'Colônia', lat: -4.3775, lng: -70.0312 },
      ],
    })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    class FailingNeighborhoodRepository extends NeighborhoodRepository {
      paginate(): never {
        throw new Error('database down')
      }
    }
    const useCase = new StorefrontNeighborhoodPaginateUseCase(
      new FailingNeighborhoodRepository(),
    )

    const result = await useCase.execute({})

    assert.containsSubset(result.value, {
      status: 500,
      code: 'STOREFRONT_NEIGHBORHOOD_PAGINATE_ERROR',
    })
  })
})
