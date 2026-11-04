import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import AdministratorPlaceShowUseCase from './show.use-case.ts'

import { WireDate } from '#core/response'
import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import PlaceMemoryRepository from '#repositories/place/place.memory.repository'
import {
  FailingPlaceRepository,
  centroForPlaces,
  placeDraft,
} from '#tests/place-fixtures'
import { ARCHIVED_AT } from '#tests/repository-fixtures'

test.group('administrator > places > show (unit)', () => {
  test('when the place is archived, the staff still reads it, with when it left', async ({
    assert,
  }) => {
    const places = new PlaceMemoryRepository()
    const centro = centroForPlaces(places, new NeighborhoodMemoryRepository())
    const gone = placeDraft({ neighborhoodId: centro.id })
    gone.archive(ARCHIVED_AT)
    places.put(gone)
    const useCase = new AdministratorPlaceShowUseCase(places)

    const result = await useCase.execute({ id: gone.id })

    assert.containsSubset(result.value, {
      id: gone.id,
      neighborhood: { slug: 'centro', name: 'Centro' },
      archivedAt: WireDate.iso(ARCHIVED_AT),
    })
  })

  test('when the id is not a place, it answers 404 PLACE_NOT_FOUND', async ({
    assert,
  }) => {
    const useCase = new AdministratorPlaceShowUseCase(
      new PlaceMemoryRepository(),
    )

    const result = await useCase.execute({ id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 404,
      code: 'PLACE_NOT_FOUND',
    })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const useCase = new AdministratorPlaceShowUseCase(
      new FailingPlaceRepository(),
    )

    const result = await useCase.execute({ id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_PLACE_SHOW_ERROR',
    })
  })
})
