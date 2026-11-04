import { PLACE_CATEGORY } from '@aporta/shared'
import { test } from '@japa/runner'

import AdministratorPlaceCreateUseCase from './create.use-case.ts'

import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import PlaceMemoryRepository from '#repositories/place/place.memory.repository'
import IdGeneratorFake from '#services/id-generator/id-generator.fake'
import {
  FailingPlaceRepository,
  PLACE_PAYLOAD,
  centroForPlaces,
} from '#tests/place-fixtures'

test.group('administrator > places > create (unit)', () => {
  test('when the payload is valid, it saves the place in the neighborhood and answers it', async ({
    assert,
  }) => {
    const places = new PlaceMemoryRepository()
    const neighborhoods = new NeighborhoodMemoryRepository()
    centroForPlaces(places, neighborhoods)
    const useCase = new AdministratorPlaceCreateUseCase(
      places,
      neighborhoods,
      new IdGeneratorFake(),
    )

    const result = await useCase.execute({
      ...PLACE_PAYLOAD,
      whatsapp: '5597999990001',
    })

    assert.containsSubset(result.value, {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Tacacá da Praça',
      whatsapp: '5597999990001',
      date: null,
      archivedAt: null,
      neighborhood: { slug: 'centro', name: 'Centro' },
    })
    const stored = await places.findAnyRecordById(
      '00000000-0000-4000-8000-000000000001',
    )
    assert.equal(stored?.place.snapshot().name, 'Tacacá da Praça')
  })

  test('when the neighborhood does not exist, it answers 422 pointing at the field', async ({
    assert,
  }) => {
    const useCase = new AdministratorPlaceCreateUseCase(
      new PlaceMemoryRepository(),
      new NeighborhoodMemoryRepository(),
      new IdGeneratorFake(),
    )

    const result = await useCase.execute(PLACE_PAYLOAD)

    assert.containsSubset(result.value, {
      status: 422,
      code: 'NEIGHBORHOOD_NOT_FOUND',
    })
  })

  test('when an event has no date, it answers 422 PLACE_EVENT_DATE_REQUIRED and saves nothing', async ({
    assert,
  }) => {
    const places = new PlaceMemoryRepository()
    const neighborhoods = new NeighborhoodMemoryRepository()
    centroForPlaces(places, neighborhoods)
    const useCase = new AdministratorPlaceCreateUseCase(
      places,
      neighborhoods,
      new IdGeneratorFake(),
    )

    const result = await useCase.execute({
      ...PLACE_PAYLOAD,
      category: PLACE_CATEGORY.EVENT,
    })

    assert.containsSubset(result.value, {
      status: 422,
      code: 'PLACE_EVENT_DATE_REQUIRED',
    })
    assert.isNull(
      await places.findAnyRecordById('00000000-0000-4000-8000-000000000001'),
    )
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const neighborhoods = new NeighborhoodMemoryRepository()
    centroForPlaces(new PlaceMemoryRepository(), neighborhoods)
    const useCase = new AdministratorPlaceCreateUseCase(
      new FailingPlaceRepository(),
      neighborhoods,
      new IdGeneratorFake(),
    )

    const result = await useCase.execute(PLACE_PAYLOAD)

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_PLACE_CREATE_ERROR',
    })
  })
})
