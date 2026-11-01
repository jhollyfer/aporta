import { test } from '@japa/runner'

import { COOKIE_TOKEN } from '#config/session-token'
import { resetDatabase } from '#tests/database-fixtures'
import { errorBody } from '#tests/response-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsModerator,
} from '#tests/session-fixtures'

/**
 * The API reference barrier: the route vanishes for whoever does not operate the panel.
 *
 * What each route spec (`documentation/<resource>/show`) asserts is the body;
 * here is the middleware decision, on the two routes it guards, and the reason for
 * it being 404 and not 401/403: denying with 403 would confirm the route exists.
 */
const GUARDED_ROUTES = ['/openapi.json', '/documentation'] as const

test.group('documentation middleware', (group) => {
  group.each.setup(() => resetDatabase())

  for (const route of GUARDED_ROUTES) {
    test(`when there is no session, ${route} answers 404 RESOURCE_NOT_FOUND`, async ({
      client,
      assert,
    }) => {
      const response = await client.get(route)

      response.assertStatus(404)
      assert.equal(errorBody(response).code, 'RESOURCE_NOT_FOUND')
    })

    test(`when the cookie is not a valid token, ${route} answers 404 and not 401`, async ({
      client,
    }) => {
      const response = await client
        .get(route)
        .cookie(COOKIE_TOKEN.ACCESS, 'token-que-ninguem-emitiu')

      response.assertStatus(404)
    })

    test(`when the session is an administrator, ${route} is served`, async ({
      client,
    }) => {
      const session = await authenticateAsAdministrator(client)

      const response = await client.get(route).cookies(session)

      response.assertStatus(200)
    })

    test(`when the session is a moderator, ${route} is served`, async ({
      client,
    }) => {
      const session = await authenticateAsModerator(client)

      const response = await client.get(route).cookies(session)

      response.assertStatus(200)
    })
  }
})
