import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import AdministratorPlaceArchiveUseCase from './archive.use-case.ts'

import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import PlaceMemoryRepository from '#repositories/place/place.memory.repository'
import ClockFake from '#services/clock/clock.fake'
import {
  FailingPlaceRepository,
  centroForPlaces,
  placeDraft,
} from '#tests/place-fixtures'

test.group('administrator > places > archive (unit)', () => {
  test('when the place is live, it goes to the trash at the clock instant; archiving again is 409', async ({
    assert,
  }) => {
    const places = new PlaceMemoryRepository()
    const centro = centroForPlaces(places, new NeighborhoodMemoryRepository())
    const place = placeDraft({ neighborhoodId: centro.id })
    places.put(place)
    const useCase = new AdministratorPlaceArchiveUseCase(
      places,
      new ClockFake(),
    )

    const first = await useCase.execute({ id: place.id })
    const second = await useCase.execute({ id: place.id })

    assert.isTrue(first.isRight())
    const stored = await places.findAnyRecordById(place.id)
    assert.deepEqual(stored?.place.snapshot().deletedAt, ClockFake.INSTANT)
    assert.containsSubset(second.value, {
      status: 409,
      code: 'PLACE_ALREADY_ARCHIVED',
    })
  })

  test('when the id is not a place, it answers 404 PLACE_NOT_FOUND', async ({
    assert,
  }) => {
    const useCase = new AdministratorPlaceArchiveUseCase(
      new PlaceMemoryRepository(),
      new ClockFake(),
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
    const useCase = new AdministratorPlaceArchiveUseCase(
      new FailingPlaceRepository(),
      new ClockFake(),
    )

    const result = await useCase.execute({ id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_PLACE_ARCHIVE_ERROR',
    })
  })
})
