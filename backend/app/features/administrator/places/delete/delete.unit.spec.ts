import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import AdministratorPlaceDeleteUseCase from './delete.use-case.ts'

import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import PlaceMemoryRepository from '#repositories/place/place.memory.repository'
import {
  FailingPlaceRepository,
  centroForPlaces,
  placeDraft,
} from '#tests/place-fixtures'
import { ARCHIVED_AT } from '#tests/repository-fixtures'

test.group('administrator > places > delete (unit)', () => {
  test('when the place is archived, it is erased for good', async ({
    assert,
  }) => {
    const places = new PlaceMemoryRepository()
    const centro = centroForPlaces(places, new NeighborhoodMemoryRepository())
    const place = placeDraft({ neighborhoodId: centro.id })
    place.archive(ARCHIVED_AT)
    places.put(place)
    const useCase = new AdministratorPlaceDeleteUseCase(places)

    const result = await useCase.execute({ id: place.id })

    assert.isTrue(result.isRight())
    assert.isNull(await places.findAnyRecordById(place.id))
  })

  test('when the place is still on the guide, it answers 409 PLACE_NOT_ARCHIVED and keeps it', async ({
    assert,
  }) => {
    const places = new PlaceMemoryRepository()
    const centro = centroForPlaces(places, new NeighborhoodMemoryRepository())
    const place = placeDraft({ neighborhoodId: centro.id })
    places.put(place)
    const useCase = new AdministratorPlaceDeleteUseCase(places)

    const result = await useCase.execute({ id: place.id })

    assert.containsSubset(result.value, {
      status: 409,
      code: 'PLACE_NOT_ARCHIVED',
    })
    assert.isNotNull(await places.findAnyRecordById(place.id))
  })

  test('when the id is not a place, it answers 404 PLACE_NOT_FOUND', async ({
    assert,
  }) => {
    const useCase = new AdministratorPlaceDeleteUseCase(
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
    const useCase = new AdministratorPlaceDeleteUseCase(
      new FailingPlaceRepository(),
    )

    const result = await useCase.execute({ id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_PLACE_DELETE_ERROR',
    })
  })
})
