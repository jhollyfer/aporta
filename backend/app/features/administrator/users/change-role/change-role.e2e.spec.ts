import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import { UserFactory } from '#database/factories/user.factory'
import UserModel from '#models/user'
import { resetDatabase } from '#tests/database-fixtures'
import { body, errorBody } from '#tests/response-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdministratorAccount,
  authenticateAsModerator,
  authenticateAsOwner,
  authenticateAsOwnerAccount,
} from '#tests/session-fixtures'
import { listingWithStatus, neighborhood } from '#tests/storefront-fixtures'

const MISSING = '00000000-0000-4000-8000-000000000000'
const url = (id: string): string => `/administrator/users/${id}/role`

/**
 * The role change, end to end. The contract asserted here: only the administrator does it, the
 * account's sessions fall with the old role, and the three refusals (own account, owner with an
 * ad, last administrator) leave the role as it was.
 *
 * The last-administrator refusal has no HTTP case: an administrator who is acting is one of the
 * active administrators, so a target that is another administrator always leaves one behind. The
 * rule is the entity's and the use-case's unit specs cover it (the race of two administrators
 * demoting each other is what it guards against).
 */
test.group('administrator > users > change-role', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the administrator promotes an owner to moderator, answers 200 and the account signs in no more with the old session', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const target = await authenticateAsOwnerAccount(client)

    const response = await client
      .put(url(target.userId))
      .cookies(admin)
      .json({ role: 'MODERATOR' })
    const old = await client
      .get('/administrator/reports')
      .cookies(target.session)

    response.assertStatus(200)
    assert.containsSubset(body(response), {
      id: target.userId,
      role: 'MODERATOR',
    })
    assert.equal((await UserModel.findOrFail(target.userId)).role, 'MODERATOR')
    old.assertStatus(401)
  })

  test('when asking for the role the account already has, answers 200 and the session stays', async ({
    client,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const target = await authenticateAsOwnerAccount(client)

    const response = await client
      .put(url(target.userId))
      .cookies(admin)
      .json({ role: 'OWNER' })
    const kept = await client.get('/account').cookies(target.session)

    response.assertStatus(200)
    kept.assertStatus(200)
  })

  test('when a second administrator is demoted by the first, answers 200 and the first stays administrator', async ({
    client,
    assert,
  }) => {
    const first = await authenticateAsAdministrator(client)
    const second = await authenticateAsAdministratorAccount(client)

    const response = await client
      .put(url(second.userId))
      .cookies(first)
      .json({ role: 'MODERATOR' })

    response.assertStatus(200)
    assert.equal(body(response).role, 'MODERATOR')
  })

  test('when the administrator changes his own role, answers 409 USER_OWN_ACCESS_CHANGE and keeps it', async ({
    client,
    assert,
  }) => {
    const self = await authenticateAsAdministratorAccount(client)

    const response = await client
      .put(url(self.userId))
      .cookies(self.session)
      .json({ role: 'MODERATOR' })

    response.assertStatus(409)
    assert.equal(errorBody(response).code, 'USER_OWN_ACCESS_CHANGE')
    assert.equal(
      (await UserModel.findOrFail(self.userId)).role,
      'ADMINISTRATOR',
    )
  })

  test('when the owner has an ad, answers 409 USER_OWNS_LISTINGS and keeps the role; without any ad, it passes', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const centro = await neighborhood()
    const advertiser = await UserFactory.create()
    const idle = await UserFactory.create()
    await listingWithStatus(LISTING_STATUS.DRAFT, {
      slug: 'minha-casa',
      neighborhoodId: centro.id,
      ownerId: advertiser.id,
    })

    const refused = await client
      .put(url(advertiser.id))
      .cookies(admin)
      .json({ role: 'MODERATOR' })
    const passes = await client
      .put(url(idle.id))
      .cookies(admin)
      .json({ role: 'MODERATOR' })

    refused.assertStatus(409)
    assert.equal(errorBody(refused).code, 'USER_OWNS_LISTINGS')
    assert.equal((await UserModel.findOrFail(advertiser.id)).role, 'OWNER')
    passes.assertStatus(200)
  })

  test('when the account does not exist, answers 404; when the role is unknown, 422', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const target = await UserFactory.create()

    const missing = await client
      .put(url(MISSING))
      .cookies(admin)
      .json({ role: 'OWNER' })
    const wrong = await client
      .put(url(target.id))
      .cookies(admin)
      .json({ role: 'ROOT' })

    missing.assertStatus(404)
    assert.equal(errorBody(missing).code, 'USER_NOT_FOUND')
    wrong.assertStatus(422)
    assert.property(errorBody(wrong).errors, 'role')
  })

  test('when the caller is a moderator or an owner, answers 403 and nothing changes; with no session, 401', async ({
    client,
    assert,
  }) => {
    const target = await UserFactory.create()
    const moderator = await authenticateAsModerator(client)
    const owner = await authenticateAsOwner(client)

    const asModerator = await client
      .put(url(target.id))
      .cookies(moderator)
      .json({ role: 'ADMINISTRATOR' })
    const asOwner = await client
      .put(url(target.id))
      .cookies(owner)
      .json({ role: 'ADMINISTRATOR' })
    const anonymous = await client
      .put(url(target.id))
      .json({ role: 'ADMINISTRATOR' })

    asModerator.assertStatus(403)
    asOwner.assertStatus(403)
    anonymous.assertStatus(401)
    assert.equal((await UserModel.findOrFail(target.id)).role, 'OWNER')
  })
})
