import { randomUUID } from 'node:crypto'

import { PLACE_CATEGORY } from '@aporta/shared'
import { test } from '@japa/runner'

import AdministratorPlaceUpdateUseCase from './update.use-case.ts'

import { WireDate } from '#core/response'
import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import PlaceMemoryRepository from '#repositories/place/place.memory.repository'
import {
  FailingPlaceRepository,
  PLACE_PAYLOAD,
  centroForPlaces,
  placeDraft,
} from '#tests/place-fixtures'
import { ARCHIVED_AT } from '#tests/repository-fixtures'

test.group('administrator > places > update (unit)', () => {
  test('when the payload is valid, it replaces the fields and keeps the identity and the trash', async ({
    assert,
  }) => {
    const places = new PlaceMemoryRepository()
    const neighborhoods = new NeighborhoodMemoryRepository()
    const centro = centroForPlaces(places, neighborhoods)
    const gone = placeDraft({
      neighborhoodId: centro.id,
      whatsapp: '5597999990001',
    })
    gone.archive(ARCHIVED_AT)
    places.put(gone)
    const useCase = new AdministratorPlaceUpdateUseCase(places, neighborhoods)

    const result = await useCase.execute({ ...PLACE_PAYLOAD, id: gone.id })

    assert.containsSubset(result.value, {
      id: gone.id,
      name: 'Tacacá da Praça',
      whatsapp: null,
      archivedAt: WireDate.iso(ARCHIVED_AT),
    })
  })

  test('when the place leaves EVENT keeping a date, it answers 422 PLACE_DATE_NOT_ALLOWED and keeps the old place', async ({
    assert,
  }) => {
    const places = new PlaceMemoryRepository()
    const neighborhoods = new NeighborhoodMemoryRepository()
    const centro = centroForPlaces(places, neighborhoods)
    const event = placeDraft({
      category: PLACE_CATEGORY.EVENT,
      date: '2027-06-26',
      neighborhoodId: centro.id,
    })
    places.put(event)
    const useCase = new AdministratorPlaceUpdateUseCase(places, neighborhoods)

    const result = await useCase.execute({
      ...PLACE_PAYLOAD,
      id: event.id,
      date: '2027-06-26',
    })

    assert.containsSubset(result.value, {
      status: 422,
      code: 'PLACE_DATE_NOT_ALLOWED',
    })
    const stored = await places.findAnyRecordById(event.id)
    assert.equal(stored?.place.snapshot().category, PLACE_CATEGORY.EVENT)
  })

  test('when the neighborhood does not exist, it answers 422 NEIGHBORHOOD_NOT_FOUND', async ({
    assert,
  }) => {
    const places = new PlaceMemoryRepository()
    const neighborhoods = new NeighborhoodMemoryRepository()
    const centro = centroForPlaces(places, neighborhoods)
    const place = placeDraft({ neighborhoodId: centro.id })
    places.put(place)
    const useCase = new AdministratorPlaceUpdateUseCase(places, neighborhoods)

    const result = await useCase.execute({
      ...PLACE_PAYLOAD,
      id: place.id,
      neighborhood: 'nao-existe',
    })

    assert.containsSubset(result.value, {
      status: 422,
      code: 'NEIGHBORHOOD_NOT_FOUND',
    })
  })

  test('when the id is not a place, it answers 404 PLACE_NOT_FOUND', async ({
    assert,
  }) => {
    const useCase = new AdministratorPlaceUpdateUseCase(
      new PlaceMemoryRepository(),
      new NeighborhoodMemoryRepository(),
    )

    const result = await useCase.execute({ ...PLACE_PAYLOAD, id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 404,
      code: 'PLACE_NOT_FOUND',
    })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const useCase = new AdministratorPlaceUpdateUseCase(
      new FailingPlaceRepository(),
      new NeighborhoodMemoryRepository(),
    )

    const result = await useCase.execute({ ...PLACE_PAYLOAD, id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_PLACE_UPDATE_ERROR',
    })
  })
})
