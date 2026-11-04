import { test } from '@japa/runner'
import { DateTime } from 'luxon'

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
  return `/administrator/places/${id}/unarchive`
}

test.group('administrator > places > unarchive', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the moderator restores an archived place, answers 204 and the guide shows it again', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsModerator(client)
    const row = await place({ name: 'Voltou', deletedAt: DateTime.now() })

    const response = await client.put(url(row.id)).cookies(session)

    response.assertStatus(204)
    assert.isNull((await PlaceModel.findOrFail(row.id)).deletedAt)
    const guide = await client.get('/storefront/places')
    assert.deepEqual(
      page(guide).data.map((each) => each.name),
      ['Voltou'],
    )
  })

  test('when the place is not archived, answers 409; when it does not exist, 404', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const row = await place()

    const live = await client.put(url(row.id)).cookies(session)
    const missing = await client.put(url(MISSING)).cookies(session)

    live.assertStatus(409)
    assert.equal(errorBody(live).code, 'PLACE_NOT_ARCHIVED')
    missing.assertStatus(404)
  })

  test('when the caller is an owner, answers 403 and the place stays archived; with no session, 401', async ({
    client,
    assert,
  }) => {
    const owner = await authenticateAsOwner(client)
    const row = await place({ deletedAt: DateTime.now() })

    const forbidden = await client.put(url(row.id)).cookies(owner)
    const anonymous = await client.put(url(row.id))

    forbidden.assertStatus(403)
    anonymous.assertStatus(401)
    assert.isNotNull((await PlaceModel.findOrFail(row.id)).deletedAt)
  })
})
