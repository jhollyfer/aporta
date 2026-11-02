import { test } from '@japa/runner'

import { resetDatabase } from '#tests/database-fixtures'
import { authenticateAsOwner } from '#tests/session-fixtures'
import { listing } from '#tests/storefront-fixtures'

const CACHEABLE = 'public, max-age=60, stale-while-revalidate=300'

/**
 * `Cache-Control: public` is for the storefront reads on a `200`, and for nothing else.
 */
test.group('public-cache middleware', (group) => {
  group.each.setup(() => resetDatabase())

  test('when a storefront read succeeds, it is public with a short max-age and a stale window', async ({
    client,
    assert,
  }) => {
    const row = await listing({ slug: 'casa' })

    for (const path of [
      '/storefront/listings',
      '/storefront/listings/pins',
      `/storefront/listings/${row.slug}`,
      '/storefront/neighborhoods',
      '/storefront/places',
    ]) {
      const response = await client.get(path)

      response.assertStatus(200)
      assert.equal(response.header('cache-control'), CACHEABLE, path)
    }
  })

  test('when a storefront read fails, it carries no cache header', async ({
    client,
    assert,
  }) => {
    const missing = await client.get('/storefront/listings/nao-existe')
    const invalid = await client.get('/storefront/listings?type=CASTLE')

    missing.assertStatus(404)
    invalid.assertStatus(422)
    assert.isUndefined(missing.header('cache-control'))
    assert.isUndefined(invalid.header('cache-control'))
  })

  test('when a storefront read is repeated with its ETag, it answers 304', async ({
    client,
    assert,
  }) => {
    const first = await client.get('/storefront/neighborhoods')
    const etag = first.header('etag')

    assert.isString(etag)

    const second = await client
      .get('/storefront/neighborhoods')
      .header('If-None-Match', String(etag))

    second.assertStatus(304)
  })

  test('when the route is private or the session door, it is never public', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsOwner(client)

    for (const path of [
      '/owner/listings',
      '/account',
      '/health-check',
      '/openapi.json',
    ]) {
      const response = await client.get(path).cookies(session)
      const header = response.header('cache-control') ?? ''

      assert.notInclude(header, 'public', path)
    }
  })
})
