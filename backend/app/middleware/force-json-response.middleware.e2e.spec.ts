import { test } from '@japa/runner'

import { errorBody } from '#tests/response-fixtures'

/**
 * The API only speaks JSON. Adonis chooses the error response format by
 * `Accept` (HTML for a browser, JSON for an API client), and the front end, when
 * navigating, sends `text/html`: without this middleware, a 404 would come out as a page.
 */
test.group('force-json-response middleware', () => {
  test('when the client asks for HTML, an unknown route still answers the JSON envelope', async ({
    client,
    assert,
  }) => {
    const response = await client
      .get('/rota-que-nao-existe')
      .header('accept', 'text/html')

    response.assertStatus(404)
    assert.include(response.header('content-type') ?? '', 'application/json')
    assert.isString(errorBody(response).code)
  })

  test('when the client asks for HTML, a real route still answers JSON', async ({
    client,
    assert,
  }) => {
    const response = await client
      .get('/health-check')
      .header('accept', 'text/html')

    response.assertStatus(200)
    assert.include(response.header('content-type') ?? '', 'application/json')
  })
})
