import { test } from '@japa/runner'

/**
 * The liveness probe (`_standards/architecture.md` §7): it answers without session, without
 * cache and without counting anything about the infrastructure.
 */
test.group('health-check', () => {
  test('when called, answers ok, without cache and with only the status', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/health-check')

    response.assertStatus(200)
    response.assertHeader('cache-control', 'no-store')

    // Deep equality, and not `assertBodyContains`: what is asserted is that the
    // body is **only** this. Disk usage, memory or connection counts in a
    // public probe would be free infrastructure information for whoever asks.
    assert.deepEqual(response.body(), { status: 'ok' })
  })

  test('when called, does not require a session nor follow redirects', async ({
    client,
  }) => {
    const response = await client.get('/health-check').redirects(0)

    response.assertStatus(200)
  })
})

/**
 * Shield security headers (`config/shield.ts`), on every response.
 * The API only answers JSON, so the CSP is the strict one; the reference page
 * (Scalar, with a CDN script) swaps the header in its own controller.
 */
test.group('security headers', () => {
  test('when the API answers, loads no resource, is not framed and is not sniffed', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/health-check')

    const csp = response.header('content-security-policy')

    assert.include(csp, "default-src 'none'")
    assert.include(csp, "frame-ancestors 'none'")
    assert.include(csp, "base-uri 'none'")
    assert.include(csp, "form-action 'none'")
    response.assertHeader('x-frame-options', 'DENY')
    response.assertHeader('x-content-type-options', 'nosniff')
  })

  test('when the answer is an error, also carries the CSP', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/account')

    response.assertStatus(401)
    assert.include(
      response.header('content-security-policy'),
      "default-src 'none'",
    )
  })
})
