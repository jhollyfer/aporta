import { test } from '@japa/runner'

import { resetDatabase } from '#tests/database-fixtures'
import { errorBody } from '#tests/response-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsModerator,
  authenticateAsOwner,
} from '#tests/session-fixtures'

/**
 * The whole role matrix, one cell per case.
 *
 * It lives apart from the resource specs because the rule it asserts is **not**
 * any resource's: it is the design of `start/routes.ts`, and it breaks when someone
 * moves a route between groups. Scattered over one file per resource, nobody would read it as
 * one thing. A feature that adds a protected group adds its rows here.
 *
 * The distinction it protects above all is `401` versus `403`: without a session the
 * requester's role is unknown, and answering "you cannot" instead of
 * "I do not know who you are" would tell someone who has not even signed in that the resource exists and that
 * there is a role able to reach it.
 */

/**
 * First row of the matrix: **without a session, 401 on every protected group**.
 *
 * Never `403`. `auth()` runs before `role()` in the group for this reason: arriving
 * first, it answers "I do not know who you are" before any role rule
 * has anything to evaluate.
 */
test.group('roles > without session', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the request is for the account without a session, answers 401, and not 403', async ({
    client,
  }) => {
    const response = await client.get('/account')

    response.assertStatus(401)
  })

  test('when the request is for the attachments without a session, answers 401, and not 403 because the role is only evaluated after the session', async ({
    client,
  }) => {
    const listed = await client.get('/storages')
    const parts = await client.get('/storages/qualquer/parts')

    listed.assertStatus(401)
    parts.assertStatus(401)
  })
})

/**
 * Second row: **the account is for every role**. Without it, a `role()` put on the group of
 * `/account` by mistake would leave the rest of the matrix green while the owners could not
 * even read their own profile.
 */
test.group('roles > the account is for every role', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the actor is the administrator, a moderator or an owner, GET /account answers 200', async ({
    client,
  }) => {
    const sessions = [
      await authenticateAsAdministrator(client),
      await authenticateAsModerator(client),
      await authenticateAsOwner(client),
    ]

    for (const session of sessions) {
      const response = await client.get('/account').cookies(session)

      response.assertStatus(200)
    }
  })
})

/**
 * Third row: **the attachments are staff only**. The library has no per-owner rule yet, so the
 * `OWNER` is refused with `403` on every route of the group, and the staff passes.
 */
test.group('roles > the attachments are staff only', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the actor is an owner, every attachments route answers 403', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsOwner(client)

    const responses = [
      await client.get('/storages').cookies(session),
      await client.get('/storages/qualquer').cookies(session),
      await client.delete('/storages/qualquer').cookies(session),
    ]

    for (const response of responses) {
      response.assertStatus(403)
      assert.equal(errorBody(response).code, 'ACCESS_DENIED')
    }
  })

  test('when the actor is the administrator or a moderator, listing the attachments answers 200', async ({
    client,
  }) => {
    const sessions = [
      await authenticateAsAdministrator(client),
      await authenticateAsModerator(client),
    ]

    for (const session of sessions) {
      const response = await client.get('/storages').cookies(session)

      response.assertStatus(200)
    }
  })
})
