import { test } from '@japa/runner'

import env from '#start/env'
import { resetDatabase } from '#tests/database-fixtures'
import { authenticateAsAdministrator } from '#tests/session-fixtures'

/**
 * `GET /openapi.json`: the document only for whoever operates the panel, and with the
 * address of this environment in place of the variable the committed file carries.
 */
test.group('documentation > openapi > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('when there is no session, answers 404, and not 401 nor 403', async ({
    client,
  }) => {
    // 401 and 403 would confirm the route exists and that there is a role that
    // reaches it. For whoever cannot see it, it simply is not there.
    const response = await client.get('/openapi.json')

    response.assertStatus(404)
  })

  test('when the caller operates, is served as JSON with the environment server', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const response = await client.get('/openapi.json').cookies(session)

    response.assertStatus(200)
    assert.include(response.header('content-type') ?? '', 'application/json')
    response.assertBodyContains({
      openapi: '3.1.0',
      servers: [{ url: env.get('APP_SERVER_URL') }],
    })
  })
})
