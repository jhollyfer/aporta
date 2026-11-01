import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { UserFactory } from '#database/factories/user.factory'
import User from '#models/user'
import { resetDatabase } from '#tests/database-fixtures'
import { body, errorBody } from '#tests/response-fixtures'
import {
  ADMINISTRATOR,
  authenticate,
  authenticateAsAdministrator,
} from '#tests/session-fixtures'

/**
 * The partial update, and the two rules that come with it.
 *
 * A validator that required `name`, `email`, `role` and `avatarId` on every
 * request would make the verb promise partial and the schema refuse partial. Here
 * `PUT` is truly partial, and the absent-field test
 * is what prevents regression to the demanding schema.
 *
 * The others assert what the merge alone does not guarantee: a new password equal to the
 * current one is 422, and changing the password drops the running session - without that, a token
 * from before the change would survive it.
 *
 * And the three about `currentPassword`, which is proof of identity and not of strength: the
 * session proves possession of the cookie, so without the current password whoever hijacks a
 * cookie changes the account owner's password.
 */
test.group('account > profile > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the payload is partial, does not erase the absent field', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .put('/account')
      .cookies(session)
      .json({ name: 'Outro Nome' })

    response.assertStatus(200)
    assert.equal(body(response).name, 'Outro Nome')
    assert.equal(body(response).email, ADMINISTRATOR.email)

    // And the database row too: neither `email` nor `role` were touched.
    const user = await User.findByOrFail('email', ADMINISTRATOR.email)
    assert.equal(user.name, 'Outro Nome')
    assert.equal(user.role, 'ADMINISTRATOR')
  })

  test('when the new password equals the current one, answers 422', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.put('/account').cookies(session).json({
      password: ADMINISTRATOR.password,
      passwordConfirmation: ADMINISTRATOR.password,
      currentPassword: ADMINISTRATOR.password,
    })

    response.assertStatus(422)
    assert.equal(errorBody(response).code, 'PASSWORD_SAME_AS_CURRENT')
  })

  test('when the password changes without the current one, answers 422 pointing at the field', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.put('/account').cookies(session).json({
      password: 'Outra-Senha1!',
      passwordConfirmation: 'Outra-Senha1!',
    })

    response.assertStatus(422)
    assert.property(errorBody(response).errors, 'currentPassword')

    // And the password remains the previous one: the new session is the proof.
    await authenticate(client, ADMINISTRATOR.email, ADMINISTRATOR.password)
  })

  test('when the current password is wrong, answers 422', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.put('/account').cookies(session).json({
      password: 'Outra-Senha1!',
      passwordConfirmation: 'Outra-Senha1!',
      currentPassword: 'Nao-E-A-Atual1!',
    })

    response.assertStatus(422)
    assert.equal(errorBody(response).code, 'CURRENT_PASSWORD_INVALID')

    await authenticate(client, ADMINISTRATOR.email, ADMINISTRATOR.password)
  })

  test('when the payload has no password change, does not require the current password', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    // `requiredIfExists('password')`: without `password` in the payload there is no
    // identity to prove, and demanding the current password to change the name would turn
    // every profile edit into a password form.
    const response = await client
      .put('/account')
      .cookies(session)
      .json({ name: 'Sem Senha' })

    response.assertStatus(200)
    assert.equal(body(response).name, 'Sem Senha')
  })

  test('when the password changes, drops the running session', async ({
    client,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const change = await client.put('/account').cookies(session).json({
      password: 'Outra-Senha1!',
      passwordConfirmation: 'Outra-Senha1!',
      currentPassword: ADMINISTRATOR.password,
    })

    change.assertStatus(200)

    // The same cookie that just worked, now without a token to back it.
    const after = await client.get('/account').cookies(session)

    after.assertStatus(401)
  })

  test('when the email is already used by another account, answers 409', async ({
    client,
    assert,
  }) => {
    const other = await UserFactory.create()
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .put('/account')
      .cookies(session)
      .json({ email: other.email })

    response.assertStatus(409)
    assert.equal(errorBody(response).code, 'USER_ALREADY_EXISTS')
  })

  test('when avatarId does not exist, answers 422 instead of blowing up the foreign key', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .put('/account')
      .cookies(session)
      .json({ avatarId: '00000000-0000-4000-8000-000000000000' })

    response.assertStatus(422)
    assert.equal(errorBody(response).code, 'STORAGE_NOT_FOUND')
  })
})

/**
 * The `currentPassword` guess limit (`signInAccountThrottle`'s account budget).
 *
 * `PUT /account` verifies the current password, so an unbounded loop of wrong ones
 * would be a guessing oracle outside the login limits. The route counts on the same
 * key as the login (`signin:<email>`), so both doors spend one budget per account.
 */
test.group('account > profile > update > current password ceiling', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the wrong current password is tried past the account budget, answers 429 in the envelope', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const statuses: number[] = []
    let last = await client.put('/account').cookies(session).json({
      password: 'Outra-Senha1!',
      passwordConfirmation: 'Outra-Senha1!',
      currentPassword: 'Nao-E-A-Atual1!',
    })

    statuses.push(last.status())

    // 20 per hour, one already spent by the sign-in of this test.
    for (let attempt = 0; attempt < 25 && last.status() !== 429; attempt++) {
      last = await client.put('/account').cookies(session).json({
        password: 'Outra-Senha1!',
        passwordConfirmation: 'Outra-Senha1!',
        currentPassword: 'Nao-E-A-Atual1!',
      })
      statuses.push(last.status())
    }

    assert.equal(last.status(), 429)
    assert.equal(errorBody(last).code, 'TOO_MANY_REQUESTS')
    assert.isAtMost(statuses.length, 20)
    assert.isTrue(statuses.slice(0, -1).every((status) => status === 422))
  })

  test('when the budget is spent here, the sign-in of the same account is refused too', async ({
    client,
  }) => {
    const session = await authenticateAsAdministrator(client)

    // The sign-in above already opened the counter under the shared key.
    await db
      .from('rate_limits')
      .where('key', `rlflx:signInAccount_signin:${ADMINISTRATOR.email}`)
      .update({ points: 20, expire: Date.now() + 60 * 60 * 1000 })

    const change = await client.put('/account').cookies(session).json({
      password: 'Outra-Senha1!',
      passwordConfirmation: 'Outra-Senha1!',
      currentPassword: 'Nao-E-A-Atual1!',
    })

    change.assertStatus(429)
  })

  test('when the payload has no current password, does not spend the budget', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    for (let attempt = 0; attempt < 25; attempt++) {
      const response = await client
        .put('/account')
        .cookies(session)
        .json({ name: `Nome ${attempt}` })

      assert.equal(response.status(), 200)
    }
  })
})
