import { PLACE_CATEGORY, TRASHED_MODE } from '@aporta/shared'
import { test } from '@japa/runner'

import AdministratorPlacePaginateUseCase from './paginate.use-case.ts'

import { WireDate } from '#core/response'
import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import PlaceMemoryRepository from '#repositories/place/place.memory.repository'
import {
  FailingPlaceRepository,
  centroForPlaces,
  placeDraft,
} from '#tests/place-fixtures'
import { ARCHIVED_AT } from '#tests/repository-fixtures'

test.group('administrator > places > paginate (unit)', () => {
  test('when listing, it brings the live ones by name; ?trashed=only brings the archived, with archivedAt', async ({
    assert,
  }) => {
    const places = new PlaceMemoryRepository()
    const centro = centroForPlaces(places, new NeighborhoodMemoryRepository())
    places.put(placeDraft({ name: 'Tacacá', neighborhoodId: centro.id }))
    places.put(
      placeDraft({
        name: 'Festival',
        category: PLACE_CATEGORY.EVENT,
        date: '2027-06-26',
        neighborhoodId: centro.id,
      }),
    )
    const gone = placeDraft({ name: 'Fechada', neighborhoodId: centro.id })
    gone.archive(ARCHIVED_AT)
    places.put(gone)
    const useCase = new AdministratorPlacePaginateUseCase(places)

    const live = await useCase.execute({})
    const trash = await useCase.execute({ trashed: TRASHED_MODE.ONLY })
    const events = await useCase.execute({ category: PLACE_CATEGORY.EVENT })

    assert.containsSubset(live.value, {
      meta: { total: 2 },
      data: [
        { name: 'Festival', archivedAt: null },
        { name: 'Tacacá', archivedAt: null },
      ],
    })
    assert.containsSubset(trash.value, {
      meta: { total: 1 },
      data: [{ name: 'Fechada', archivedAt: WireDate.iso(ARCHIVED_AT) }],
    })
    assert.containsSubset(events.value, { meta: { total: 1 } })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const useCase = new AdministratorPlacePaginateUseCase(
      new FailingPlaceRepository(),
    )

    const result = await useCase.execute({})

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_PLACE_PAGINATE_ERROR',
    })
  })
})
