import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { COOKIE_TOKEN } from '#config/session-token'
import { resetDatabase } from '#tests/database-fixtures'
import { errorBody } from '#tests/response-fixtures'
import { authenticateAsAdministrator } from '#tests/session-fixtures'

/**
 * The renewal swaps the whole pair: the refresh cookie is the only one that reaches
 * this route, and the pair that comes out of it is new in both tokens.
 *
 * The check of the token `name` - the refresh one presented as an access
 * token - lives in `sign-out/sign-out.e2e.spec.ts`: that is where the request under test
 * lands, and it is the authenticated route's guard that refuses it.
 */
test.group('authentication > session > refresh', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the session is valid, renews it and returns a new token pair', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/authentication/refresh')
      .cookies(session)

    response.assertStatus(204)
    assert.notEqual(
      response.cookie(COOKIE_TOKEN.ACCESS)?.value,
      session[COOKIE_TOKEN.ACCESS],
    )
    assert.notEqual(
      response.cookie(COOKIE_TOKEN.REFRESH)?.value,
      session[COOKIE_TOKEN.REFRESH],
    )
  })

  test('when there is no refresh cookie, answers 401', async ({ client }) => {
    const response = await client.post('/authentication/refresh')

    response.assertStatus(401)
  })
})

/**
 * The renewal ceiling (`refreshThrottle`), per IP, generous.
 *
 * The counter is seeded at the ceiling, in the database: sixty renewals over HTTP just to
 * reach the limit would say nothing more.
 */
test.group('authentication > session > refresh > ceiling', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the per-IP ceiling is exceeded, answers 429 in the envelope', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    await db.table('rate_limits').insert({
      key: 'rlflx:refresh_ip_127.0.0.1',
      points: 60,
      expire: Date.now() + 60 * 1000,
    })

    const response = await client
      .post('/authentication/refresh')
      .cookies(session)

    response.assertStatus(429)
    assert.equal(errorBody(response).code, 'TOO_MANY_REQUESTS')
    assert.isDefined(response.header('retry-after'))
  })

  test('when the per-IP ceiling is not exceeded, the renewal proceeds normally', async ({
    client,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/authentication/refresh')
      .cookies(session)

    response.assertStatus(204)
  })
})
