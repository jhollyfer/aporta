import { PLACE_CATEGORY } from '@aporta/shared'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import PlaceModel from '#models/place'
import { resetDatabase } from '#tests/database-fixtures'
import { body, errorBody } from '#tests/response-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsModerator,
  authenticateAsOwner,
} from '#tests/session-fixtures'
import { neighborhood, place, placeOf } from '#tests/storefront-fixtures'

const MISSING = '00000000-0000-4000-8000-000000000000'

/** A `string` and not the literal: the typed overload refuses the malformed ids and bodies sent on purpose. */
function url(id: string): string {
  return `/administrator/places/${id}`
}

const PAYLOAD = {
  category: 'EAT',
  name: 'Peixaria Nova',
  description: 'Tambaqui e pirarucu na brasa.',
  neighborhood: 'centro',
  address: 'Rua do Porto',
  hours: 'Seg a sáb, 11h às 15h',
}

test.group('administrator > places > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the moderator sends the new fields, answers 200 and the row changes', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood({ slug: 'centro', name: 'Centro' })
    const colonia = await neighborhood({ slug: 'colonia', name: 'Colônia' })
    const session = await authenticateAsModerator(client)
    const row = await place({
      name: 'Peixaria',
      whatsapp: '5597999990001',
      neighborhoodId: colonia.id,
    })

    const response = await client
      .put(url(row.id))
      .cookies(session)
      .json(PAYLOAD)

    response.assertStatus(200)
    assert.containsSubset(body(response), {
      id: row.id,
      name: 'Peixaria Nova',
      whatsapp: null,
      neighborhood: { slug: 'centro', name: 'Centro' },
    })
    const saved = await PlaceModel.findOrFail(row.id)
    assert.equal(saved.name, 'Peixaria Nova')
    assert.equal(saved.neighborhoodId, centro.id)
    assert.isNull(saved.whatsapp)
  })

  test('when an event becomes a restaurant, the day has to go along; otherwise 422 and the row stays', async ({
    client,
    assert,
  }) => {
    await neighborhood({ slug: 'centro', name: 'Centro' })
    const session = await authenticateAsAdministrator(client)
    const row = await placeOf(PLACE_CATEGORY.EVENT, {
      name: 'Festival',
      date: DateTime.fromISO('2027-06-26'),
    })

    const refused = await client
      .put(url(row.id))
      .cookies(session)
      .json({ ...PAYLOAD, date: '2027-06-26' })
    const accepted = await client
      .put(url(row.id))
      .cookies(session)
      .json(PAYLOAD)

    refused.assertStatus(422)
    assert.equal(errorBody(refused).code, 'PLACE_DATE_NOT_ALLOWED')
    accepted.assertStatus(200)
    const saved = await PlaceModel.findOrFail(row.id)
    assert.equal(saved.category, PLACE_CATEGORY.EAT)
    assert.isNull(saved.date)
  })

  test('when the place is archived, the edit works and it stays archived', async ({
    client,
    assert,
  }) => {
    await neighborhood({ slug: 'centro', name: 'Centro' })
    const session = await authenticateAsAdministrator(client)
    const row = await place({ deletedAt: DateTime.now() })

    const response = await client
      .put(url(row.id))
      .cookies(session)
      .json(PAYLOAD)

    response.assertStatus(200)
    assert.isString(body(response).archivedAt)
    assert.isNotNull((await PlaceModel.findOrFail(row.id)).deletedAt)
  })

  test('when the neighborhood does not exist, answers 422; when the place does not exist, 404', async ({
    client,
    assert,
  }) => {
    await neighborhood({ slug: 'centro', name: 'Centro' })
    const session = await authenticateAsAdministrator(client)
    const row = await place()

    const noNeighborhood = await client
      .put(url(row.id))
      .cookies(session)
      .json({ ...PAYLOAD, neighborhood: 'nenhum' })
    const missing = await client
      .put(url(MISSING))
      .cookies(session)
      .json(PAYLOAD)

    noNeighborhood.assertStatus(422)
    assert.equal(errorBody(noNeighborhood).code, 'NEIGHBORHOOD_NOT_FOUND')
    missing.assertStatus(404)
  })

  test('when the payload breaks a rule, answers 422 pointing at the fields', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const row = await place()

    const response = await client
      .put(url(row.id))
      .cookies(session)
      .json({ ...PAYLOAD, name: '', address: 'x' })

    response.assertStatus(422)
    assert.sameMembers(Object.keys(errorBody(response).errors ?? {}), [
      'name',
      'address',
    ])
  })

  test('when the caller is an owner, answers 403 and the row stays; with no session, 401', async ({
    client,
    assert,
  }) => {
    await neighborhood({ slug: 'centro', name: 'Centro' })
    const owner = await authenticateAsOwner(client)
    const row = await place({ name: 'Intacta' })

    const forbidden = await client.put(url(row.id)).cookies(owner).json(PAYLOAD)
    const anonymous = await client.put(url(row.id)).json(PAYLOAD)

    forbidden.assertStatus(403)
    anonymous.assertStatus(401)
    assert.equal((await PlaceModel.findOrFail(row.id)).name, 'Intacta')
  })
})
