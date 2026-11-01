import { test } from '@japa/runner'

import { resetDatabase } from '#tests/database-fixtures'
import { authenticateAsAdministrator } from '#tests/session-fixtures'

/** `GET /documentation`: the navigable reference, closed like the document. */
test.group('documentation > reference > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('when there is no session, answers 404, and not 401 nor 403', async ({
    client,
  }) => {
    const response = await client.get('/documentation').redirects(0)

    response.assertStatus(404)
  })

  test('when the caller operates, is served as HTML pointing at the document', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const response = await client.get('/documentation').cookies(session)

    response.assertStatus(200)
    assert.include(response.header('content-type') ?? '', 'text/html')
    assert.include(response.text(), '/openapi.json')
  })

  test('when served, swaps the strict API CSP for one that lets Scalar load', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const response = await client.get('/documentation').cookies(session)

    const csp = response.header('content-security-policy') ?? ''

    assert.include(csp, "frame-ancestors 'none'")
    // Without `default-src`, the CDN script and the inline `<script>` run.
    assert.notInclude(csp, 'default-src')
  })
})
