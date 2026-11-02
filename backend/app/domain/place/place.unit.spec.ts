import { PLACE_CATEGORY } from '@aporta/shared'
import { test } from '@japa/runner'

import Place from '#domain/place/place.entity'
import { placeDraft } from '#tests/place-fixtures'

test.group('domain > place', () => {
  test('when created as a restaurant, it is live and has no date', ({
    assert,
  }) => {
    const snapshot = placeDraft().snapshot()

    assert.equal(snapshot.category, PLACE_CATEGORY.EAT)
    assert.isNull(snapshot.date)
    assert.isNull(snapshot.deletedAt)
  })

  test('when created as an event with a date, it keeps the date', ({
    assert,
  }) => {
    const snapshot = placeDraft({
      category: PLACE_CATEGORY.EVENT,
      date: '2027-06-26',
    }).snapshot()

    assert.equal(snapshot.date, '2027-06-26')
  })

  test('when the name is blank, it refuses with PLACE_NAME_EMPTY', ({
    assert,
  }) => {
    const draft = placeDraft().snapshot()

    const result = Place.create({ ...draft, name: ' ' })

    assert.deepEqual(result.value, { code: 'PLACE_NAME_EMPTY' })
  })

  test('when an event has no date, it refuses with PLACE_EVENT_DATE_REQUIRED', ({
    assert,
  }) => {
    const draft = placeDraft().snapshot()

    const result = Place.create({
      ...draft,
      category: PLACE_CATEGORY.EVENT,
      date: null,
    })

    assert.deepEqual(result.value, { code: 'PLACE_EVENT_DATE_REQUIRED' })
  })

  test('when a place that is not an event has a date, it refuses with PLACE_DATE_NOT_ALLOWED', ({
    assert,
  }) => {
    const draft = placeDraft().snapshot()

    const result = Place.create({ ...draft, date: '2027-06-26' })

    assert.deepEqual(result.value, { code: 'PLACE_DATE_NOT_ALLOWED' })
  })
})
