import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import User from '#models/user'
import { resetDatabase } from '#tests/database-fixtures'
import { body } from '#tests/response-fixtures'
import {
  ADMINISTRATOR,
  authenticateAsAdministrator,
} from '#tests/session-fixtures'

/**
 * Reading the account itself, and what happens to someone archived while
 * still holding a token.
 *
 * The guard checks the token's signature and validity, and nothing else: it does not know that
 * the row in `users` was archived. Without the `notDeleted` scope in the use-case,
 * archiving a user would have no effect until the token expired - up to a day
 * later, by the access cookie's lifetime.
 */
test.group('account > profile > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the session is valid, answers 200 with the user itself', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.get('/account').cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).email, ADMINISTRATOR.email)
    assert.equal(body(response).role, 'ADMINISTRATOR')
    // The password never leaves in the response: the column is `serializeAs: null`.
    assert.notProperty(body(response), 'password')
  })

  test('when the user is archived with a still-valid token, answers 401', async ({
    client,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await User.findByOrFail('email', ADMINISTRATOR.email)

    await user.merge({ deletedAt: DateTime.now() }).save()

    const response = await client.get('/account').cookies(session)

    // 401 and not 404: the guard re-reads `deletedAt` and `status` on every request,
    // so archiving the account ends the session instead of leaving it authenticated
    // until the token expires. The earlier 404 said "you are authenticated, but your
    // own account does not exist", which described the hole instead of the rule.
    response.assertStatus(401)
  })
})
