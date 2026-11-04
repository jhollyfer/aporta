import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import PlaceModel from '#models/place'
import { resetDatabase } from '#tests/database-fixtures'
import { errorBody } from '#tests/response-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsModerator,
  authenticateAsOwner,
} from '#tests/session-fixtures'
import { place } from '#tests/storefront-fixtures'

const MISSING = '00000000-0000-4000-8000-000000000000'

/** A `string` and not the literal: the typed overload refuses the malformed ids sent on purpose. */
function url(id: string): string {
  return `/administrator/places/${id}/permanent`
}

/**
 * Deleting a place for good. The contract asserted here: only the administrator, and only a place
 * that was archived first.
 */
test.group('administrator > places > delete', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the administrator deletes an archived place, answers 204 and the row is gone', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const row = await place({ deletedAt: DateTime.now() })
    const kept = await place({ name: 'Fica' })

    const response = await client.delete(url(row.id)).cookies(session)

    response.assertStatus(204)
    assert.isNull(await PlaceModel.find(row.id))
    assert.isNotNull(await PlaceModel.find(kept.id))
    const show = await client
      .get(`/administrator/places/${row.id}`)
      .cookies(session)
    show.assertStatus(404)
  })

  test('when the caller is a moderator, answers 403 and the place stays', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsModerator(client)
    const row = await place({ deletedAt: DateTime.now() })

    const response = await client.delete(url(row.id)).cookies(session)

    response.assertStatus(403)
    assert.isNotNull(await PlaceModel.find(row.id))
  })

  test('when the caller is an owner, answers 403; with no session, 401', async ({
    client,
  }) => {
    const owner = await authenticateAsOwner(client)
    const row = await place({ deletedAt: DateTime.now() })

    const forbidden = await client.delete(url(row.id)).cookies(owner)
    const anonymous = await client.delete(url(row.id))

    forbidden.assertStatus(403)
    anonymous.assertStatus(401)
  })

  test('when the place is still on the guide, answers 409 PLACE_NOT_ARCHIVED and keeps it', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const row = await place()

    const response = await client.delete(url(row.id)).cookies(session)

    response.assertStatus(409)
    assert.equal(errorBody(response).code, 'PLACE_NOT_ARCHIVED')
    assert.isNotNull(await PlaceModel.find(row.id))
  })

  test('when the place does not exist, answers 404; when the id is malformed, 422', async ({
    client,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const missing = await client.delete(url(MISSING)).cookies(session)
    const malformed = await client.delete(url('not-a-uuid')).cookies(session)

    missing.assertStatus(404)
    malformed.assertStatus(422)
  })
})
