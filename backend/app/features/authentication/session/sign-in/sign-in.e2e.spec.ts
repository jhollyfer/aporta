import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { COOKIE_TOKEN } from '#config/session-token'
import { resetDatabase } from '#tests/database-fixtures'
import { body, errorBody } from '#tests/response-fixtures'
import { ADMINISTRATOR } from '#tests/session-fixtures'

/**
 * The whole session through the real path: sign-in is the only way to obtain a
 * valid cookie, and every other test in the suite depends on it.
 *
 * What is asserted here is the contract: the token comes out in a
 * `httpOnly` cookie and not in the body, and the refusal does not reveal whether the email
 * exists - otherwise the login form becomes a registration checker.
 */
test.group('authentication > session > sign-in', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the credential is correct, answers 204 with the two cookies', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post('/authentication/sign-in')
      .json(ADMINISTRATOR)

    response.assertStatus(204)

    // No body: the token pair travels only in `Set-Cookie`, and the page's
    // JavaScript never reaches it.
    assert.isEmpty(response.text())
    assert.isDefined(response.cookie(COOKIE_TOKEN.ACCESS)?.value)
    assert.isDefined(response.cookie(COOKIE_TOKEN.REFRESH)?.value)
  })

  test('when the session opens, the cookies carry the `aporta-` prefix', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post('/authentication/sign-in')
      .json(ADMINISTRATOR)

    // Literal names on purpose: asserting through `COOKIE_TOKEN` would pass for any value.
    // In production the cookie domain is shared with other apps of the house, and a bare
    // `access-token` would be overwritten by theirs (and overwrite it).
    assert.deepEqual(Object.keys(response.cookies()).sort(), [
      'aporta-access-token',
      'aporta-refresh-token',
    ])
  })

  test('when the credential is wrong, answers 401 without revealing whether the email exists', async ({
    client,
    assert,
  }) => {
    const existing = await client
      .post('/authentication/sign-in')
      .json({ email: ADMINISTRATOR.email, password: 'Errada1234!' })

    const unknown = await client
      .post('/authentication/sign-in')
      .json({ email: 'ninguem@mail.com', password: 'Errada1234!' })

    existing.assertStatus(401)
    unknown.assertStatus(401)

    // Same response in both cases: any difference - code, message or
    // pointed field - would turn the login into a registration checker.
    assert.deepEqual(body(existing), body(unknown))
    assert.equal(errorBody(existing).code, 'INVALID_CREDENTIALS')

    // And no cookie is written on refusal.
    assert.isUndefined(existing.cookie(COOKIE_TOKEN.ACCESS))
  })
})

/**
 * The per-account ceiling (`signInAccountThrottle`) counts by normalized email.
 *
 * The account counter is seeded at the limit, in the database, because blowing through twenty
 * attempts over HTTP would hit the per-IP ceiling first (five per minute). With the
 * bucket full under the lowercase key, the request that varies the case and adds
 * spaces at the ends is only refused if it lands in the same bucket.
 */
test.group(
  'authentication > session > sign-in > per-account ceiling',
  (group) => {
    group.each.setup(() => resetDatabase())

    test('when the email case and spaces vary, lands in the same bucket', async ({
      client,
      assert,
    }) => {
      await db.table('rate_limits').insert({
        // `rlflx:` is the rate-limiter-flexible prefix underneath the limiter.
        key: 'rlflx:signInAccount_signin:administrator@example.com',
        points: 20,
        expire: Date.now() + 60 * 60 * 1000,
      })

      const response = await client.post('/authentication/sign-in').json({
        email: '  Administrator@EXAMPLE.com ',
        password: 'Errada1234!',
      })

      response.assertStatus(429)
      assert.isUndefined(response.cookie(COOKIE_TOKEN.ACCESS))
    })
  },
)

/**
 * The limiter's 429 in the house envelope.
 *
 * The `ThrottleException` would answer on its own `{ errors: [{ message }] }` in
 * English and without `code`. The per-IP counter is seeded at the ceiling, in the database, so the
 * next attempt is the one that blows through.
 */
test.group('authentication > session > sign-in > 429', (group) => {
  group.each.setup(() => resetDatabase())

  async function exhaustIpLimit() {
    await db.table('rate_limits').insert({
      key: 'rlflx:signIn_ip_127.0.0.1',
      points: 5,
      expire: Date.now() + 10 * 60 * 1000,
    })
  }

  test('when the ceiling is exceeded, answers the envelope with a stable code and Retry-After', async ({
    client,
    assert,
  }) => {
    await exhaustIpLimit()

    const response = await client
      .post('/authentication/sign-in')
      .json({ email: 'quem@exemplo.com', password: 'nao-importa' })

    response.assertStatus(429)

    const error = errorBody(response)
    assert.equal(error.code, 'TOO_MANY_REQUESTS')
    assert.equal(error.status, 429)
    assert.equal(
      error.message,
      'Tentativas em excesso. Tente novamente mais tarde',
    )
    assert.isAbove(Number(response.header('retry-after')), 0)
    assert.isDefined(response.header('x-ratelimit-limit'))
  })

  test('when the request has a language, the message comes out in it', async ({
    client,
    assert,
  }) => {
    await exhaustIpLimit()

    const response = await client
      .post('/authentication/sign-in')
      .header('accept-language', 'es')
      .json({ email: 'quem@exemplo.com', password: 'nao-importa' })

    response.assertStatus(429)
    assert.equal(
      errorBody(response).message,
      'Demasiados intentos. Inténtalo de nuevo más tarde',
    )
    assert.equal(errorBody(response).code, 'TOO_MANY_REQUESTS')
  })
})
