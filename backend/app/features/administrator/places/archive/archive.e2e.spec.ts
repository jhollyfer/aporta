import { test } from '@japa/runner'

import PlaceModel from '#models/place'
import { resetDatabase } from '#tests/database-fixtures'
import { errorBody, page } from '#tests/response-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsModerator,
  authenticateAsOwner,
} from '#tests/session-fixtures'
import { place } from '#tests/storefront-fixtures'

const MISSING = '00000000-0000-4000-8000-000000000000'

/** A `string` and not the literal: the typed overload refuses the malformed ids sent on purpose. */
function url(id: string): string {
  return `/administrator/places/${id}`
}

test.group('administrator > places > archive', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the moderator archives a place, answers 204, it leaves the public guide and shows in the trash', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsModerator(client)
    const row = await place({ name: 'Fechou' })
    await place({ name: 'Fica' })

    const response = await client.delete(url(row.id)).cookies(session)

    response.assertStatus(204)
    assert.isNotNull((await PlaceModel.findOrFail(row.id)).deletedAt)
    const guide = await client.get('/storefront/places')
    assert.deepEqual(
      page(guide).data.map((each) => each.name),
      ['Fica'],
    )
    const trash = await client
      .get('/administrator/places')
      .qs({ trashed: 'only' })
      .cookies(session)
    assert.deepEqual(
      page(trash).data.map((each) => each.name),
      ['Fechou'],
    )
  })

  test('when the place is archived again, answers 409; when it does not exist, 404', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const row = await place()
    await client.delete(url(row.id)).cookies(session)

    const again = await client.delete(url(row.id)).cookies(session)
    const missing = await client.delete(url(MISSING)).cookies(session)

    again.assertStatus(409)
    assert.equal(errorBody(again).code, 'PLACE_ALREADY_ARCHIVED')
    missing.assertStatus(404)
  })

  test('when the caller is an owner, answers 403 and the place stays; with no session, 401', async ({
    client,
    assert,
  }) => {
    const owner = await authenticateAsOwner(client)
    const row = await place()

    const forbidden = await client.delete(url(row.id)).cookies(owner)
    const anonymous = await client.delete(url(row.id))

    forbidden.assertStatus(403)
    anonymous.assertStatus(401)
    assert.isNull((await PlaceModel.findOrFail(row.id)).deletedAt)
  })
})
