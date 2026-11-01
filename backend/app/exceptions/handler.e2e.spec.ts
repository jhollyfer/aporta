import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import AuthenticationSessionSignInUseCase from '#features/authentication/session/sign-in/sign-in.use-case'
import SessionTokenRepository from '#repositories/session-token/session-token.repository'
import UserRepository from '#repositories/user/user.repository'
import { resetDatabase } from '#tests/database-fixtures'
import { errorBody } from '#tests/response-fixtures'
import { ADMINISTRATOR } from '#tests/session-fixtures'

/**
 * What the global handler returns when the failure is not a business one.
 *
 * The error escapes the use-case - a sign-in use-case that throws instead of answering
 * `Either` -, which is what a defect looks like: nothing masked it. If the handler passed
 * through `error.message`, the client would read the driver's message.
 */
const DRIVER_MESSAGE =
  'insert into "session_tokens" ("user_id") values ($1) - duplicate key value violates unique constraint "session_tokens_pkey"'

@inject()
class ThrowingSignIn extends AuthenticationSessionSignInUseCase {
  constructor(users: UserRepository, tokens: SessionTokenRepository) {
    super(users, tokens)
  }

  override execute(): Promise<never> {
    return Promise.reject(new Error(DRIVER_MESSAGE))
  }
}

test.group('handler > server failure outside the use-case', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the driver fails, answers the generic envelope without the driver message', async ({
    client,
    assert,
    cleanup,
  }) => {
    app.container.swap(AuthenticationSessionSignInUseCase, () =>
      app.container.make(ThrowingSignIn),
    )
    cleanup(() => app.container.restore(AuthenticationSessionSignInUseCase))

    const response = await client
      .post('/authentication/sign-in')
      .json(ADMINISTRATOR)

    response.assertStatus(500)

    const error = errorBody(response)
    assert.equal(error.code, 'SERVER_ERROR')
    assert.equal(error.status, 500)
    assert.equal(error.message, 'Erro interno do servidor')
    assert.notInclude(response.text(), 'session_tokens')
    assert.notInclude(response.text(), 'duplicate key')
  })

  test('when the generic message is shown, comes out in the request language', async ({
    client,
    assert,
    cleanup,
  }) => {
    app.container.swap(AuthenticationSessionSignInUseCase, () =>
      app.container.make(ThrowingSignIn),
    )
    cleanup(() => app.container.restore(AuthenticationSessionSignInUseCase))

    const response = await client
      .post('/authentication/sign-in')
      .header('accept-language', 'en')
      .json(ADMINISTRATOR)

    response.assertStatus(500)
    assert.equal(errorBody(response).message, 'Internal server error')
    assert.notInclude(response.text(), 'duplicate key')
  })
})
