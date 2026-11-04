import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { UserFactory } from '#database/factories/user.factory'
import { resetDatabase } from '#tests/database-fixtures'
import { body, errorBody } from '#tests/response-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsModerator,
  authenticateAsOwner,
} from '#tests/session-fixtures'

const MISSING = '00000000-0000-4000-8000-000000000000'
const url = (id: string): string => `/administrator/users/${id}`

test.group('administrator > users > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the administrator reads an account, answers 200 with the allowlisted fields', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const target = await UserFactory.apply('inactive').create()

    const response = await client.get(url(target.id)).cookies(session)

    response.assertStatus(200)
    assert.containsSubset(body(response), {
      id: target.id,
      email: target.email,
      role: 'OWNER',
      status: 'INACTIVE',
      verifiedAt: null,
    })
    assert.notProperty(body(response), 'password')
  })

  test('when the account is unknown or archived, answers 404 USER_NOT_FOUND', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const gone = await UserFactory.merge({ deletedAt: DateTime.now() }).create()

    const unknown = await client.get(url(MISSING)).cookies(session)
    const trashed = await client.get(url(gone.id)).cookies(session)

    unknown.assertStatus(404)
    trashed.assertStatus(404)
    assert.equal(errorBody(unknown).code, 'USER_NOT_FOUND')
  })

  test('when the caller is a moderator or an owner, answers 403; with no session, 401', async ({
    client,
  }) => {
    const target = await UserFactory.create()
    const moderator = await authenticateAsModerator(client)
    const owner = await authenticateAsOwner(client)

    const asModerator = await client.get(url(target.id)).cookies(moderator)
    const asOwner = await client.get(url(target.id)).cookies(owner)
    const anonymous = await client.get(url(target.id))

    asModerator.assertStatus(403)
    asOwner.assertStatus(403)
    anonymous.assertStatus(401)
  })
})
