import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import AdministratorPlaceUnarchiveUseCase from './unarchive.use-case.ts'

import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import PlaceMemoryRepository from '#repositories/place/place.memory.repository'
import {
  FailingPlaceRepository,
  centroForPlaces,
  placeDraft,
} from '#tests/place-fixtures'
import { ARCHIVED_AT } from '#tests/repository-fixtures'

test.group('administrator > places > unarchive (unit)', () => {
  test('when the place is archived, it leaves the trash; restoring a live one is 409', async ({
    assert,
  }) => {
    const places = new PlaceMemoryRepository()
    const centro = centroForPlaces(places, new NeighborhoodMemoryRepository())
    const place = placeDraft({ neighborhoodId: centro.id })
    place.archive(ARCHIVED_AT)
    places.put(place)
    const useCase = new AdministratorPlaceUnarchiveUseCase(places)

    const first = await useCase.execute({ id: place.id })
    const second = await useCase.execute({ id: place.id })

    assert.isTrue(first.isRight())
    const stored = await places.findAnyRecordById(place.id)
    assert.isNull(stored?.place.snapshot().deletedAt)
    assert.containsSubset(second.value, {
      status: 409,
      code: 'PLACE_NOT_ARCHIVED',
    })
  })

  test('when the id is not a place, it answers 404 PLACE_NOT_FOUND', async ({
    assert,
  }) => {
    const useCase = new AdministratorPlaceUnarchiveUseCase(
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
    const useCase = new AdministratorPlaceUnarchiveUseCase(
      new FailingPlaceRepository(),
    )

    const result = await useCase.execute({ id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_PLACE_UNARCHIVE_ERROR',
    })
  })
})
