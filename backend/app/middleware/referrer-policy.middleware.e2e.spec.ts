import { test } from '@japa/runner'

import { resetDatabase } from '#tests/database-fixtures'
import { authenticateAsAdministrator } from '#tests/session-fixtures'

test.group('referrer-policy middleware', (group) => {
  group.each.setup(() => resetDatabase())

  test('when any response is sent, it carries no-referrer: a route, an unknown path and the docs page', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const health = await client.get('/health-check')
    const missing = await client.get('/rota-que-nao-existe')
    const reference = await client.get('/documentation').cookies(session)

    health.assertStatus(200)
    missing.assertStatus(404)
    reference.assertStatus(200)
    for (const response of [health, missing, reference])
      assert.equal(response.header('referrer-policy'), 'no-referrer')
  })
})
