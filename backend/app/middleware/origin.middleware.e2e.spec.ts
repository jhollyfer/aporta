import { test } from '@japa/runner'

import { errorBody } from '#tests/response-fixtures'

/**
 * The allowlist of `config/cors.ts`, which comes from `CORS_ORIGINS`.
 *
 * The test runs outside development - `NODE_ENV=test` -, which is the only
 * condition in which the list holds: in dev the configuration allows any origin and
 * there would be nothing to measure. The chosen route is `/health-check`, because it is public and what
 * is measured is the response header, not the body.
 */
test.group('cors > allowlist', () => {
  test('when the origin is in the allowlist, receives the header', async ({
    client,
    assert,
  }) => {
    const response = await client
      .get('/health-check')
      .header('origin', 'http://localhost:5173')

    response.assertStatus(200)
    assert.equal(
      response.header('access-control-allow-origin'),
      'http://localhost:5173',
    )
    // With credentials the browser only accepts a named origin, never `*`: without this
    // header the session cookie does not go up on the cross-origin request.
    assert.equal(response.header('access-control-allow-credentials'), 'true')
  })

  test('when the origin is outside the allowlist, does not receive the header', async ({
    client,
    assert,
  }) => {
    const response = await client
      .get('/health-check')
      .header('origin', 'http://intruso.example')

    // The request itself goes through - CORS is a browser decision, and the server
    // merely stops authorizing. Without the header, the browser discards the
    // response.
    response.assertStatus(200)
    assert.isUndefined(response.header('access-control-allow-origin'))
  })
})

/**
 * The CSRF barrier on every write.
 *
 * `config/shield.ts` has `csrf.enabled: false`, and the preflight only protects what
 * the browser is obliged to preflight: `multipart/form-data`,
 * `application/x-www-form-urlencoded` and `text/plain` go through without it, and a POST
 * with no body or `Content-Type` too. In production the cookie travels along, which is
 * exactly the condition of a CSRF.
 *
 * `OriginMiddleware` is what closes this, and this group is what stops the barrier
 * from vanishing unnoticed: it has no visible effect on a legitimate
 * request, so nothing else would fail on its removal.
 */
test.group('cors > cross-origin write', () => {
  const CONTENT_TYPES = [
    'application/x-www-form-urlencoded',
    'multipart/form-data; boundary=x',
    'text/plain',
    'application/json',
  ] as const

  for (const contentType of CONTENT_TYPES) {
    test(`when the origin is outside the allowlist, it is refused with 403 (${contentType})`, async ({
      client,
      assert,
    }) => {
      const response = await client
        .post('/authentication/sign-in')
        .header('origin', 'http://intruso.example')
        .header('content-type', contentType)

      response.assertStatus(403)
      assert.equal(errorBody(response).code, 'ORIGIN_NOT_ALLOWED')
    })
  }

  test('when a POST with no body or Content-Type comes from an origin outside the allowlist, refuses it', async ({
    client,
    assert,
  }) => {
    // The write the hole let through: with no body, the other site's `fetch`
    // does not send `Content-Type`, does not trigger a preflight and carries the cookie.
    const response = await client
      .post('/authentication/refresh')
      .header('origin', 'http://intruso.example')

    response.assertStatus(403)
    assert.equal(errorBody(response).code, 'ORIGIN_NOT_ALLOWED')
  })

  test('when the method is PUT or DELETE, also goes through the barrier', async ({
    client,
    assert,
  }) => {
    const put = await client
      .put('/account')
      .header('origin', 'http://intruso.example')
    const remove = await client
      .delete('/storages/00000000-0000-4000-8000-000000000000')
      .header('origin', 'http://intruso.example')

    put.assertStatus(403)
    remove.assertStatus(403)
    assert.equal(errorBody(put).code, 'ORIGIN_NOT_ALLOWED')
    assert.equal(errorBody(remove).code, 'ORIGIN_NOT_ALLOWED')
  })

  test('when the origin is in the allowlist, passes the barrier', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post('/authentication/sign-in')
      .header('origin', 'http://localhost:5173')
      .json({ email: 'quem@exemplo.com', password: 'nao-importa' })

    // It passes the barrier and reaches the validator or the credentials: what matters
    // is **not** being the origin 403.
    assert.notEqual(errorBody(response).code, 'ORIGIN_NOT_ALLOWED')
  })

  test('when there is no Origin nor Sec-Fetch-Site, passes because it is not a browser', async ({
    client,
    assert,
  }) => {
    // Postman, mobile and server do not send `Origin`. The same decision that CORS's
    // `origin` already makes.
    const response = await client
      .post('/authentication/sign-in')
      .json({ email: 'quem@exemplo.com', password: 'nao-importa' })

    assert.notEqual(errorBody(response).code, 'ORIGIN_NOT_ALLOWED')
  })

  test('when there is no Origin and Sec-Fetch-Site is cross-site, refuses', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post('/authentication/refresh')
      .header('sec-fetch-site', 'cross-site')

    response.assertStatus(403)
    assert.equal(errorBody(response).code, 'ORIGIN_NOT_ALLOWED')
  })

  test('when there is no Origin and Sec-Fetch-Site is same-origin, passes', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post('/authentication/refresh')
      .header('sec-fetch-site', 'same-origin')

    assert.notEqual(errorBody(response).code, 'ORIGIN_NOT_ALLOWED')
  })

  test('when a read comes from an origin outside the allowlist, does not go through the barrier', async ({
    client,
  }) => {
    // GET does not change state: what blocks the cross-origin read is CORS, which
    // does not send the permission header (`allowlist` group).
    const response = await client
      .get('/health-check')
      .header('origin', 'http://intruso.example')

    response.assertStatus(200)
  })
})
