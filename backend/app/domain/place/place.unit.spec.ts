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

  test('when the date is not on the calendar, it refuses with PLACE_DATE_INVALID', ({
    assert,
  }) => {
    const draft = placeDraft().snapshot()

    const result = Place.create({
      ...draft,
      category: PLACE_CATEGORY.EVENT,
      date: '2027-02-31',
    })

    assert.deepEqual(result.value, { code: 'PLACE_DATE_INVALID' })
  })

  test('when changed, it takes the new fields and keeps the identity and the trash', ({
    assert,
  }) => {
    const place = placeDraft()
    const before = place.snapshot()

    const result = place.change({
      category: PLACE_CATEGORY.EVENT,
      name: 'Festival',
      description: before.description,
      neighborhoodId: before.neighborhoodId,
      address: before.address,
      hours: before.hours,
      whatsapp: '5597999990009',
      date: '2027-06-26',
    })

    assert.isTrue(result.isRight())
    assert.containsSubset(place.snapshot(), {
      id: before.id,
      name: 'Festival',
      category: PLACE_CATEGORY.EVENT,
      date: '2027-06-26',
      whatsapp: '5597999990009',
      deletedAt: null,
    })
  })

  test('when changed out of EVENT keeping the date, it refuses and the place stays as it was', ({
    assert,
  }) => {
    const place = placeDraft({
      category: PLACE_CATEGORY.EVENT,
      date: '2027-06-26',
    })
    const before = place.snapshot()

    const result = place.change({
      ...before,
      category: PLACE_CATEGORY.EAT,
    })

    assert.deepEqual(result.value, { code: 'PLACE_DATE_NOT_ALLOWED' })
    assert.deepEqual(place.snapshot(), before)
  })

  test('when archived, it goes to the trash; archiving again refuses with PLACE_ALREADY_ARCHIVED', ({
    assert,
  }) => {
    const place = placeDraft()
    const at = new Date('2026-11-01T12:00:00.000Z')

    const first = place.archive(at)
    const second = place.archive(at)

    assert.isTrue(first.isRight())
    assert.equal(place.snapshot().deletedAt, at)
    assert.deepEqual(second.value, { code: 'PLACE_ALREADY_ARCHIVED' })
  })

  test('when unarchived, it leaves the trash; a live one refuses with PLACE_NOT_ARCHIVED', ({
    assert,
  }) => {
    const place = placeDraft()
    place.archive(new Date())

    const first = place.unarchive()
    const second = place.unarchive()

    assert.isTrue(first.isRight())
    assert.isNull(place.snapshot().deletedAt)
    assert.deepEqual(second.value, { code: 'PLACE_NOT_ARCHIVED' })
  })

  test('when erasing, only an archived place may go', ({ assert }) => {
    const place = placeDraft()

    const live = place.ensureErasable()
    place.archive(new Date())
    const archived = place.ensureErasable()

    assert.deepEqual(live.value, { code: 'PLACE_NOT_ARCHIVED' })
    assert.isTrue(archived.isRight())
  })
})
