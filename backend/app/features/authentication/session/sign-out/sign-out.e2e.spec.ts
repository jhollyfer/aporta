import { test } from '@japa/runner'

import { COOKIE_TOKEN } from '#config/session-token'
import { resetDatabase } from '#tests/database-fixtures'
import { authenticateAsAdministrator } from '#tests/session-fixtures'

/**
 * Signing out has to hold on the server, and not only on the screen.
 *
 * With a JWT in the body, kept by the client, "signing out" would be the browser
 * forgetting it - and the token would remain valid until it expired. Here the token is a row in `auth_access_tokens`, and deleting it is what
 * makes the session unrecoverable.
 */
test.group('authentication > session > sign-out', (group) => {
  group.each.setup(() => resetDatabase())

  test('when signing out, invalidates the running session', async ({
    client,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const signOut = await client
      .post('/authentication/sign-out')
      .cookies(session)

    signOut.assertStatus(204)

    // The same access cookie, now without the row that backed it.
    const repeated = await client
      .post('/authentication/sign-out')
      .cookies(session)

    repeated.assertStatus(401)
  })
})

/**
 * The guard checks the token `name`, and not only the signature.
 *
 * Both tokens come out of the same `DbAccessTokensProvider` and are indistinguishable
 * by verification: without this check, presenting the refresh one as an access token
 * would give a seven-day session where the contract promises one.
 */
test.group('authentication > session > sign-out > the token name', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the refresh token is presented as access token, answers 401', async ({
    client,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.post('/authentication/sign-out').cookies({
      [COOKIE_TOKEN.ACCESS]: session[COOKIE_TOKEN.REFRESH],
    })

    response.assertStatus(401)
  })
})
