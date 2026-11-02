import { test } from '@japa/runner'

import Neighborhood from '#domain/neighborhood/neighborhood.entity'
import { neighborhoodDraft } from '#tests/neighborhood-fixtures'

test.group('domain > neighborhood', () => {
  test('when created, it is live and keeps the slug, the name and the center', ({
    assert,
  }) => {
    const snapshot = neighborhoodDraft({
      slug: 'centro',
      name: 'Centro',
      lat: -4.3775,
      lng: -70.0312,
    }).snapshot()

    assert.equal(snapshot.slug, 'centro')
    assert.equal(snapshot.name, 'Centro')
    assert.equal(snapshot.lat, -4.3775)
    assert.equal(snapshot.lng, -70.0312)
    assert.isNull(snapshot.deletedAt)
  })

  test('when the name is blank, it refuses with NEIGHBORHOOD_NAME_EMPTY', ({
    assert,
  }) => {
    const result = Neighborhood.create({
      id: 'a',
      slug: 'a',
      name: '   ',
      lat: 0,
      lng: 0,
    })

    assert.deepEqual(result.value, { code: 'NEIGHBORHOOD_NAME_EMPTY' })
  })

  test('when the center is off the globe, it refuses with NEIGHBORHOOD_COORDINATES_INVALID', ({
    assert,
  }) => {
    for (const [lat, lng] of [
      [91, 0],
      [-91, 0],
      [0, 181],
      [0, -181],
    ] as const) {
      const result = Neighborhood.create({
        id: 'a',
        slug: 'a',
        name: 'Centro',
        lat,
        lng,
      })

      assert.deepEqual(result.value, {
        code: 'NEIGHBORHOOD_COORDINATES_INVALID',
      })
    }
  })

  test('when restored, it returns the same state without checking it again', ({
    assert,
  }) => {
    const snapshot = neighborhoodDraft().snapshot()

    assert.deepEqual(Neighborhood.restore(snapshot).snapshot(), snapshot)
  })
})
