import { test } from '@japa/runner'

import { COOKIE_TOKEN } from '#config/session-token'
import { resetDatabase } from '#tests/database-fixtures'
import { authenticateAsAdministrator } from '#tests/session-fixtures'

/**
 * `SilentAuthMiddleware` runs on every route and only tries to identify the caller: it never
 * refuses. The public route is the health check (`/health-check`), where refusing would be
 * taking the probe down for whoever has a stale cookie; the proof that it actually
 * identifies is the API reference, which only opens for whoever the middleware
 * recognized (`documentation.middleware.e2e.spec.ts`).
 */
test.group('silent-auth middleware', (group) => {
  group.each.setup(() => resetDatabase())

  test('when there is no cookie, a public route still answers 200', async ({
    client,
  }) => {
    const response = await client.get('/health-check')

    response.assertStatus(200)
  })

  test('when the cookie is invalid, a public route still answers 200', async ({
    client,
  }) => {
    const response = await client
      .get('/health-check')
      .cookie(COOKIE_TOKEN.ACCESS, 'token-que-ninguem-emitiu')

    response.assertStatus(200)
  })

  test('when the cookie is the refresh token, a public route still answers 200', async ({
    client,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .get('/health-check')
      .cookie(COOKIE_TOKEN.ACCESS, session[COOKIE_TOKEN.REFRESH])

    response.assertStatus(200)
  })

  test('when the session is valid, the user is identified for the guarded routes', async ({
    client,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.get('/openapi.json').cookies(session)

    response.assertStatus(200)
  })

  test('when the refresh token is sent as the access cookie, the user is not identified', async ({
    client,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .get('/openapi.json')
      .cookie(COOKIE_TOKEN.ACCESS, session[COOKIE_TOKEN.REFRESH])

    response.assertStatus(404)
  })
})
