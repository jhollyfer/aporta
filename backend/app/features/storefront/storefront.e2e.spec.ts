import { randomUUID } from 'node:crypto'

import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

import { resetDatabase } from '#tests/database-fixtures'

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

  test('when the routes are listed, there are four and every one is a read', ({
    assert,
  }) => {
    const routes = storefrontRoutes()

    // Listings (paginate, show), neighborhoods and places (paginate). The number is here so that
    // adding a route to the group forces a look at this file.
    assert.lengthOf(routes, 4)

    // `HEAD` is left out because Adonis registers it on its own alongside every `GET`. Without
    // filtering by method before counting: a new write would go unnoticed, which is precisely what
    // this assertion exists to catch.
    const writes = routes.filter((route) =>
      route.methods.some((method) => method !== 'GET' && method !== 'HEAD'),
    )

    assert.deepEqual(writes, [])
  })

  test('when the routes are compared with the health check, none carries a middleware of its own', ({
    assert,
  }) => {
    // The server-level stack (body parser, i18n, JSON, silent auth...) is on every route, so the
    // count is never zero. The probe of `/health-check` has nothing but that stack: a storefront
    // route with `middleware.auth()`, a role or a throttle would have one more.
    const probe = Object.values(router.toJSON())
      .flat()
      .find((route) => route.pattern === '/health-check')

    assert.isDefined(probe)

    for (const route of storefrontRoutes()) {
      assert.equal(
        route.middleware.all().size,
        probe?.middleware.all().size,
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
  })
})
