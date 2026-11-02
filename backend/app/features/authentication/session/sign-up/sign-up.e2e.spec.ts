import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { UserFactory } from '#database/factories/user.factory'
import UserModel from '#models/user'
import { countRows, resetDatabase } from '#tests/database-fixtures'
import { body, errorBody } from '#tests/response-fixtures'
import { authenticate } from '#tests/session-fixtures'

/**
 * A `string` and not the literal: the literal selects the typed overload of the client, whose
 * payload is the validator's output and refuses exactly what these cases send on purpose (a
 * key that must be dropped, a field missing, a confirmation the validator does not declare).
 */
const URL: string = '/authentication/sign-up'

const PAYLOAD = {
  name: 'Seu Raimundo',
  email: 'raimundo@mail.com',
  password: 'Demo1234!',
  passwordConfirmation: 'Demo1234!',
}

/**
 * The owner's registration through the real path: the validator pair, the hash, the `UNIQUE`
 * and the per-IP ceiling. The contract asserted here is that the role is never the client's
 * (an `OWNER` comes out even when `ADMINISTRATOR` is sent), that no session opens, and that
 * the account created can sign in right after - the only proof that the password was hashed
 * the way the login reads it.
 */
test.group('authentication > session > sign-up', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the payload is valid, answers 201 with the OWNER profile and no cookie', async ({
    client,
    assert,
  }) => {
    const response = await client.post(URL).json(PAYLOAD)

    response.assertStatus(201)

    const profile = body(response)
    assert.equal(profile.email, PAYLOAD.email)
    assert.equal(profile.name, PAYLOAD.name)
    assert.equal(profile.role, 'OWNER')
    assert.equal(profile.status, 'ACTIVE')
    assert.notProperty(profile, 'password')
    assert.isEmpty(response.cookies())
  })

  test('when the account is created, the password is stored hashed and signs in', async ({
    client,
    assert,
  }) => {
    await client.post(URL).json(PAYLOAD)

    const row = await UserModel.findByOrFail('email', PAYLOAD.email)
    assert.notEqual(row.password, PAYLOAD.password)

    await authenticate(client, PAYLOAD.email, PAYLOAD.password)
  })

  test('when the client sends a role, it is ignored and the account is an OWNER', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post(URL)
      .json({ ...PAYLOAD, role: 'ADMINISTRATOR', status: 'INACTIVE' })

    response.assertStatus(201)
    assert.equal(body(response).role, 'OWNER')
    assert.equal(body(response).status, 'ACTIVE')
  })

  test('when the email is already used, answers 409 and does not write', async ({
    client,
    assert,
  }) => {
    const other = await UserFactory.create()
    const before = await countRows(db.from('users').count('* as count'))

    const response = await client
      .post(URL)
      .json({ ...PAYLOAD, email: other.email })

    response.assertStatus(409)
    assert.equal(errorBody(response).code, 'USER_ALREADY_EXISTS')
    assert.equal(await countRows(db.from('users').count('* as count')), before)
  })

  test('when the email is the one of an archived account, answers 409', async ({
    client,
    assert,
  }) => {
    const other = await UserFactory.create()
    await UserModel.query()
      .where('id', other.id)
      .update({ deleted_at: new Date() })

    const response = await client
      .post(URL)
      .json({ ...PAYLOAD, email: other.email })

    response.assertStatus(409)
    assert.equal(errorBody(response).code, 'USER_ALREADY_EXISTS')
  })

  test('when the password is weak, answers 422 in Portuguese pointing at the field', async ({
    client,
    assert,
  }) => {
    const response = await client.post(URL).json({
      ...PAYLOAD,
      password: 'senhafraca',
      passwordConfirmation: 'senhafraca',
    })

    response.assertStatus(422)
    assert.equal(errorBody(response).code, 'VALIDATION_ERROR')
    assert.property(errorBody(response).errors, 'password')
    assert.equal(
      await countRows(
        db.from('users').where('email', PAYLOAD.email).count('* as count'),
      ),
      0,
    )
  })

  test('when the confirmation differs, answers 422 pointing at the confirmation', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post(URL)
      .json({ ...PAYLOAD, passwordConfirmation: 'Outra1234!' })

    response.assertStatus(422)
    assert.property(errorBody(response).errors, 'passwordConfirmation')
  })

  test('when fields are missing, answers 422 for each', async ({
    client,
    assert,
  }) => {
    const response = await client.post(URL).json({})

    response.assertStatus(422)
    for (const field of ['name', 'email', 'password'])
      assert.property(errorBody(response).errors, field)
  })
})

/**
 * The per-IP ceiling, in its own bucket (`signUp`), seeded at the limit in the database: five
 * real sign-ups would work too, but each one costs a password hash.
 */
test.group('authentication > session > sign-up > 429', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the ceiling is exceeded, answers the envelope with Retry-After and creates nothing', async ({
    client,
    assert,
  }) => {
    await db.table('rate_limits').insert({
      key: 'rlflx:signUp_ip_127.0.0.1',
      points: 5,
      expire: Date.now() + 10 * 60 * 1000,
    })

    const response = await client.post(URL).json(PAYLOAD)

    response.assertStatus(429)
    assert.equal(errorBody(response).code, 'TOO_MANY_REQUESTS')
    assert.isAbove(Number(response.header('retry-after')), 0)
    assert.equal(
      await countRows(
        db.from('users').where('email', PAYLOAD.email).count('* as count'),
      ),
      0,
    )
  })

  test('when the sign-in bucket is full, the sign-up still answers', async ({
    client,
  }) => {
    await db.table('rate_limits').insert({
      key: 'rlflx:signIn_ip_127.0.0.1',
      points: 5,
      expire: Date.now() + 10 * 60 * 1000,
    })

    const response = await client.post(URL).json(PAYLOAD)

    response.assertStatus(201)
  })
})
