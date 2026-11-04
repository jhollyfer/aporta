import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import PlaceModel from '#models/place'
import { countRows, resetDatabase } from '#tests/database-fixtures'
import { body, errorBody, object, page } from '#tests/response-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsModerator,
  authenticateAsOwner,
} from '#tests/session-fixtures'
import { neighborhood } from '#tests/storefront-fixtures'

/**
 * A `string` and not the literal: the literal selects the typed overload of the client, whose
 * payload is the validator's output and refuses exactly what these cases send on purpose.
 */
const URL: string = '/administrator/places'

const PAYLOAD = {
  category: 'EAT',
  name: 'Tacacá da Praça',
  description: 'Tacacá quentinho no fim da tarde.',
  neighborhood: 'centro',
  address: 'Praça da Matriz',
  hours: 'Todos os dias, 16h às 21h',
  whatsapp: '5597999990001',
}

test.group('administrator > places > create', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the moderator sends a valid place, answers 201 with the place and the guide shows it', async ({
    client,
    assert,
  }) => {
    await neighborhood({ slug: 'centro', name: 'Centro' })
    const session = await authenticateAsModerator(client)

    const response = await client.post(URL).cookies(session).json(PAYLOAD)

    response.assertStatus(201)
    const created = body(response)
    assert.containsSubset(created, {
      name: 'Tacacá da Praça',
      category: 'EAT',
      whatsapp: '5597999990001',
      date: null,
      archivedAt: null,
    })
    assert.deepEqual(object(created.neighborhood), {
      slug: 'centro',
      name: 'Centro',
    })
    const guide = await client.get('/storefront/places')
    assert.lengthOf(page(guide).data, 1)
  })

  test('when the place is an event with a day and no number, answers 201 and keeps the day', async ({
    client,
    assert,
  }) => {
    await neighborhood({ slug: 'centro', name: 'Centro' })
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post(URL)
      .cookies(session)
      .json({
        ...PAYLOAD,
        category: 'EVENT',
        date: '2027-06-26',
        whatsapp: '',
      })

    response.assertStatus(201)
    assert.containsSubset(body(response), {
      category: 'EVENT',
      date: '2027-06-26',
      whatsapp: null,
    })
    const row = await PlaceModel.firstOrFail()
    assert.equal(row.date?.toFormat('yyyy-LL-dd'), '2027-06-26')
  })

  test('when an event has no day, a place has a day, or the day does not exist, answers 422 on date', async ({
    client,
    assert,
  }) => {
    await neighborhood({ slug: 'centro', name: 'Centro' })
    const session = await authenticateAsAdministrator(client)

    const noDay = await client
      .post(URL)
      .cookies(session)
      .json({ ...PAYLOAD, category: 'EVENT' })
    const dayOnPlace = await client
      .post(URL)
      .cookies(session)
      .json({ ...PAYLOAD, date: '2027-06-26' })
    const impossible = await client
      .post(URL)
      .cookies(session)
      .json({ ...PAYLOAD, category: 'EVENT', date: '2027-02-31' })

    for (const [response, code] of [
      [noDay, 'PLACE_EVENT_DATE_REQUIRED'],
      [dayOnPlace, 'PLACE_DATE_NOT_ALLOWED'],
      [impossible, 'PLACE_DATE_INVALID'],
    ] as const) {
      response.assertStatus(422)
      assert.equal(errorBody(response).code, code)
      assert.property(errorBody(response).errors ?? {}, 'date')
    }
    assert.equal(await countRows(db.from('places').count('* as count')), 0)
  })

  test('when the neighborhood does not exist, answers 422 on the field and writes nothing', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post(URL)
      .cookies(session)
      .json({ ...PAYLOAD, neighborhood: 'nenhum' })

    response.assertStatus(422)
    assert.equal(errorBody(response).code, 'NEIGHBORHOOD_NOT_FOUND')
    assert.property(errorBody(response).errors ?? {}, 'neighborhood')
    assert.equal(await countRows(db.from('places').count('* as count')), 0)
  })

  test('when the payload breaks a rule, answers 422 pointing at each field', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post(URL)
      .cookies(session)
      .json({ ...PAYLOAD, category: 'PARTY', name: 'a', hours: '' })

    response.assertStatus(422)
    assert.sameMembers(Object.keys(errorBody(response).errors ?? {}), [
      'category',
      'name',
      'hours',
    ])
  })

  test('when the caller is an owner, answers 403 and writes nothing; with no session, 401', async ({
    client,
    assert,
  }) => {
    await neighborhood({ slug: 'centro', name: 'Centro' })
    const owner = await authenticateAsOwner(client)

    const forbidden = await client.post(URL).cookies(owner).json(PAYLOAD)
    const anonymous = await client.post(URL).json(PAYLOAD)

    forbidden.assertStatus(403)
    anonymous.assertStatus(401)
    assert.equal(await countRows(db.from('places').count('* as count')), 0)
  })
})
