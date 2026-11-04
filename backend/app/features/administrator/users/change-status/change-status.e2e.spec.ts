import { test } from '@japa/runner'

import { FACTORY_PASSWORD, UserFactory } from '#database/factories/user.factory'
import UserModel from '#models/user'
import { resetDatabase } from '#tests/database-fixtures'
import { body, errorBody } from '#tests/response-fixtures'
import {
  authenticate,
  authenticateAsAdministrator,
  authenticateAsAdministratorAccount,
  authenticateAsModerator,
  authenticateAsOwner,
  authenticateAsOwnerAccount,
} from '#tests/session-fixtures'

const MISSING = '00000000-0000-4000-8000-000000000000'
const url = (id: string): string => `/administrator/users/${id}/status`

/**
 * The suspension, end to end. The contract asserted here: a suspended account cannot sign in, its
 * open session falls on the next request and does not come back on reactivation; the
 * administrator cannot suspend himself; and only the administrator calls the route.
 */
test.group('administrator > users > change-status', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the administrator suspends an account, its open session falls and it cannot sign in; reactivated, it signs in again', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const target = await authenticateAsOwnerAccount(client)
    const email = (await UserModel.findOrFail(target.userId)).email

    const suspended = await client
      .put(url(target.userId))
      .cookies(admin)
      .json({ status: 'INACTIVE' })
    const session = await client.get('/account').cookies(target.session)
    const signIn = await client
      .post('/authentication/sign-in')
      .json({ email, password: FACTORY_PASSWORD })
    const reactivated = await client
      .put(url(target.userId))
      .cookies(admin)
      .json({ status: 'ACTIVE' })
    const oldSession = await client.get('/account').cookies(target.session)
    const again = await authenticate(client, email, FACTORY_PASSWORD)

    suspended.assertStatus(200)
    assert.equal(body(suspended).status, 'INACTIVE')
    session.assertStatus(401)
    signIn.assertStatus(401)
    reactivated.assertStatus(200)
    assert.equal(body(reactivated).status, 'ACTIVE')
    oldSession.assertStatus(401)
    const fresh = await client.get('/account').cookies(again)
    fresh.assertStatus(200)
  })

  test('when a suspended account tries to renew the token, answers 401', async ({
    client,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const target = await authenticateAsOwnerAccount(client)
    await client
      .put(url(target.userId))
      .cookies(admin)
      .json({ status: 'INACTIVE' })

    const refresh = await client
      .post('/authentication/refresh')
      .cookies(target.session)

    refresh.assertStatus(401)
  })

  test('when the administrator suspends himself, answers 409 USER_OWN_ACCESS_CHANGE and the session keeps working', async ({
    client,
    assert,
  }) => {
    const self = await authenticateAsAdministratorAccount(client)

    const response = await client
      .put(url(self.userId))
      .cookies(self.session)
      .json({ status: 'INACTIVE' })
    const still = await client.get('/administrator/users').cookies(self.session)

    response.assertStatus(409)
    assert.equal(errorBody(response).code, 'USER_OWN_ACCESS_CHANGE')
    still.assertStatus(200)
  })

  test('when a second administrator is suspended by the first, answers 200', async ({
    client,
  }) => {
    const first = await authenticateAsAdministrator(client)
    const second = await UserFactory.apply('administrator').create()

    const response = await client
      .put(url(second.id))
      .cookies(first)
      .json({ status: 'INACTIVE' })

    response.assertStatus(200)
  })

  test('when the account does not exist, answers 404; when the status is unknown, 422', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const target = await UserFactory.create()

    const missing = await client
      .put(url(MISSING))
      .cookies(admin)
      .json({ status: 'INACTIVE' })
    const wrong = await client
      .put(url(target.id))
      .cookies(admin)
      .json({ status: 'BANNED' })

    missing.assertStatus(404)
    assert.equal(errorBody(missing).code, 'USER_NOT_FOUND')
    wrong.assertStatus(422)
    assert.property(errorBody(wrong).errors, 'status')
  })

  test('when the caller is a moderator or an owner, answers 403 and nobody is suspended; with no session, 401', async ({
    client,
    assert,
  }) => {
    const target = await UserFactory.create()
    const moderator = await authenticateAsModerator(client)
    const owner = await authenticateAsOwner(client)

    const asModerator = await client
      .put(url(target.id))
      .cookies(moderator)
      .json({ status: 'INACTIVE' })
    const asOwner = await client
      .put(url(target.id))
      .cookies(owner)
      .json({ status: 'INACTIVE' })
    const anonymous = await client
      .put(url(target.id))
      .json({ status: 'INACTIVE' })

    asModerator.assertStatus(403)
    asOwner.assertStatus(403)
    anonymous.assertStatus(401)
    assert.equal((await UserModel.findOrFail(target.id)).status, 'ACTIVE')
  })
})
