import { randomUUID } from 'node:crypto'

import router from '@adonisjs/core/services/router'
import db from '@adonisjs/lucid/services/db'
import { z } from '@aporta/shared'
import { test } from '@japa/runner'

import { resetDatabase } from '#tests/database-fixtures'
import { errorBody } from '#tests/response-fixtures'

const Counters = z.array(z.object({ key: z.string(), points: z.number() }))

/**
 * The public storefront, as a module.
 *
 * What is asserted here is the trait of the `/storefront` group: **no request in this file sends a
 * cookie or an `Authorization` header**, and a test that authenticated "just in case" would stop
 * proving exactly that. What belongs to a single route (the cut, the filters, the 404) lives in the
 * action folder (`app/features/storefront/<resource>/<action>/<action>.e2e.spec.ts`).
 */

/**
 * The group trait, asserted over the **router** and not over a hand-written list.
 *
 * Enumerating the routes here would make the test age by the next day: a new route would enter
 * `/storefront` without ever being checked, which is exactly the case this file exists to catch.
 * Reading `router.toJSON()`, every route registered in the group falls into the loop by
 * construction.
 */
test.group('storefront > the whole group', (group) => {
  group.each.setup(() => resetDatabase())

  /**
   * Read inside the test, and not in the module body: the router only knows the routes after
   * `commit()`, which happens when the test server boots, and the spec import comes before that.
   */
  function storefrontRoutes() {
    return Object.values(router.toJSON())
      .flat()
      .filter((route) => route.pattern.startsWith('/storefront'))
  }

  test('when the routes are listed, there are six and every one is a read but the scam report', ({
    assert,
  }) => {
    const routes = storefrontRoutes()

    // Listings (paginate, pins, show), neighborhoods and places (paginate), and the report. The
    // number is here so that adding a route to the group forces a look at this file.
    assert.lengthOf(routes, 6)

    // `HEAD` is left out because Adonis registers it on its own alongside every `GET`. Without
    // filtering by method before counting: a new write would go unnoticed, which is precisely what
    // this assertion exists to catch.
    const writes = routes.filter((route) =>
      route.methods.some((method) => method !== 'GET' && method !== 'HEAD'),
    )

    // The one write is the public report, and it is exactly the one named here: a second write
    // entering the group fails this line.
    assert.deepEqual(
      writes.map((route) => route.pattern),
      ['/storefront/reports'],
    )
  })

  test('when the routes are compared with the health check, each read carries exactly its throttle and its cache header, and the report only its own throttle', ({
    assert,
  }) => {
    // The server-level stack (body parser, i18n, JSON, silent auth...) is on every route, so the
    // count is never zero. The probe of `/health-check` has nothing but that stack: a storefront
    // route with `middleware.auth()`, a role or a throttle would have one more.
    const probe = Object.values(router.toJSON())
      .flat()
      .find((route) => route.pattern === '/health-check')

    assert.isDefined(probe)

    const base = probe?.middleware.all().size ?? 0

    for (const route of storefrontRoutes()) {
      // The report adds the per-IP throttle and nothing else: no `auth()`, no role, no cache (a
      // write). Every read adds two: the per-IP read ceiling and `Cache-Control`.
      let extra = 2
      if (route.pattern === '/storefront/reports') extra = 1

      assert.equal(
        route.middleware.all().size,
        base + extra,
        `${route.pattern} declares middleware of its own`,
      )
    }
  })

  test('when called without a cookie or an Authorization header, no route requires one', async ({
    client,
    assert,
  }) => {
    for (const route of storefrontRoutes().filter((item) =>
      item.methods.includes('GET'),
    )) {
      // The value of the parameter does not matter: what is asserted is that the response is
      // neither 401 nor 403. An unknown `:slug` gives 404, and the listings give 200 - both prove
      // the request went through.
      const path = route.pattern.replace(':slug', randomUUID())

      const response = await client.get(path)

      assert.notInclude(
        [401, 403],
        response.status(),
        `${route.pattern} required a session`,
      )
    }

    const report = await client
      .post('/storefront/reports')
      .json({ slug: randomUUID(), reason: 'SCAM' })

    assert.notInclude(
      [401, 403],
      report.status(),
      'the report required a session',
    )
  })

  test('when a client passes the read ceiling, answers 429 with Retry-After in the house envelope, and the report keeps its own bucket', async ({
    client,
    assert,
  }) => {
    await db.table('rate_limits').insert({
      key: 'rlflx:storefrontRead_ip_127.0.0.1',
      points: 120,
      expire: Date.now() + 60 * 1000,
    })

    for (const path of [
      '/storefront/listings',
      '/storefront/listings/pins',
      '/storefront/neighborhoods',
      '/storefront/places',
    ]) {
      const response = await client.get(path)

      response.assertStatus(429)
      assert.equal(errorBody(response).code, 'TOO_MANY_REQUESTS', path)
      assert.isDefined(response.header('retry-after'), path)
      assert.isUndefined(response.header('cache-control'), path)
    }

    // Spending the read bucket never spends the report one: a visitor who scrolled a lot can
    // still warn the others about a scam.
    const report = await client
      .post('/storefront/reports')
      .json({ slug: randomUUID(), reason: 'SCAM' })

    assert.notEqual(report.status(), 429)
  })

  test('when a client is under the read ceiling, a read is counted and still answers 200', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/storefront/neighborhoods')

    response.assertStatus(200)
    const rows: unknown = await db.from('rate_limits').select('key', 'points')
    const [row] = Counters.parse(rows)

    assert.equal(row?.key, 'rlflx:storefrontRead_ip_127.0.0.1')
    assert.equal(row?.points, 1)
  })
})
