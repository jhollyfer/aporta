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

  test("when the request is for the owner's ads without a session, answers 401, and not 403", async ({
    client,
  }) => {
    const listed = await client.get('/owner/listings')
    const created = await client.post('/owner/listings')

    listed.assertStatus(401)
    created.assertStatus(401)
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
 * Third row: **the attachments are for the staff and the owners**. The `OWNER` uploads the
 * pictures of his ads, so the group lets him in; what he reaches inside it is `StoragePolicy`'s
 * (proved in the attachments specs), and the matrix only proves that the door is open to the three
 * roles and shut to a request without a session.
 */
test.group(
  'roles > the attachments are for the staff and the owners',
  (group) => {
    group.each.setup(() => resetDatabase())

    test('when the actor is the administrator, a moderator or an owner, listing the attachments answers 200', async ({
      client,
    }) => {
      const sessions = [
        await authenticateAsAdministrator(client),
        await authenticateAsModerator(client),
        await authenticateAsOwner(client),
      ]

      for (const session of sessions) {
        const response = await client.get('/storages').cookies(session)

        response.assertStatus(200)
      }
    })
  },
)

/**
 * Fourth row: **the owner's ads are for the `OWNER` only**. The staff reviews other people's ads
 * through its own routes, and an administrator creating an ad here would be creating it under his
 * own account, so the group refuses the staff with `403` (the role is known, and it is the wrong
 * one).
 */
test.group("roles > the owner's ads are for the OWNER only", (group) => {
  group.each.setup(() => resetDatabase())

  test('when the actor is the administrator or a moderator, every owner route answers 403', async ({
    client,
    assert,
  }) => {
    const sessions = [
      await authenticateAsAdministrator(client),
      await authenticateAsModerator(client),
    ]

    for (const session of sessions) {
      const responses = [
        await client.get('/owner/listings').cookies(session),
        await client.post('/owner/listings').cookies(session),
        await client
          .get('/owner/listings/00000000-0000-4000-8000-000000000001')
          .cookies(session),
      ]

      for (const response of responses) {
        response.assertStatus(403)
        assert.equal(errorBody(response).code, 'ACCESS_DENIED')
      }
    }
  })

  test('when the actor is an owner, listing his ads answers 200', async ({
    client,
  }) => {
    const session = await authenticateAsOwner(client)

    const response = await client.get('/owner/listings').cookies(session)

    response.assertStatus(200)
  })
})
