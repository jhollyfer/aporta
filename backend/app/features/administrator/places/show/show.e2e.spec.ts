import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { resetDatabase } from '#tests/database-fixtures'
import { body } from '#tests/response-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsModerator,
  authenticateAsOwner,
} from '#tests/session-fixtures'
import { neighborhood, place } from '#tests/storefront-fixtures'

const MISSING = '00000000-0000-4000-8000-000000000000'

/** A `string` and not the literal: the typed overload refuses the malformed ids sent on purpose. */
function url(id: string): string {
  return `/administrator/places/${id}`
}

test.group('administrator > places > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the moderator asks for a place, answers 200 with the neighborhood and no panel field', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood({ slug: 'centro', name: 'Centro' })
    const session = await authenticateAsModerator(client)
    const row = await place({ name: 'Tacacá', neighborhoodId: centro.id })

    const response = await client.get(url(row.id)).cookies(session)

    response.assertStatus(200)
    assert.containsSubset(body(response), {
      id: row.id,
      name: 'Tacacá',
      archivedAt: null,
      neighborhood: { slug: 'centro', name: 'Centro' },
    })
    assert.notProperty(body(response), 'deletedAt')
  })

  test('when the place is archived, the staff still reads it, with when it left', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const row = await place({ deletedAt: DateTime.now() })

    const response = await client.get(url(row.id)).cookies(session)

    response.assertStatus(200)
    assert.isString(body(response).archivedAt)
  })

  test('when the id does not exist, answers 404; when it is malformed, 422', async ({
    client,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const missing = await client.get(url(MISSING)).cookies(session)
    const malformed = await client.get(url('not-a-uuid')).cookies(session)

    missing.assertStatus(404)
    malformed.assertStatus(422)
  })

  test('when the caller is an owner, answers 403; with no session, 401', async ({
    client,
  }) => {
    const row = await place()
    const owner = await authenticateAsOwner(client)

    const forbidden = await client.get(url(row.id)).cookies(owner)
    const anonymous = await client.get(url(row.id))

    forbidden.assertStatus(403)
    anonymous.assertStatus(401)
  })
})
