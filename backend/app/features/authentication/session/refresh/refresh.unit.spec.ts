import { ACTIVE_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import AuthenticationSessionRefreshUseCase from './refresh.use-case.ts'

import SessionTokenMemoryRepository from '#repositories/session-token/session-token.memory.repository'
import UserMemoryRepository from '#repositories/user/user.memory.repository'
import { present } from '#tests/response-fixtures'
import { RefusingSessionTokens } from '#tests/session-token-fixtures'
import { userDraft } from '#tests/user-fixtures'

/** An account saved with an issued token pair. */
async function subject(input: Parameters<typeof userDraft>[0] = {}) {
  const users = new UserMemoryRepository()
  const tokens = new SessionTokenMemoryRepository()
  const user = userDraft(input)
  await users.save(user)
  const pair = await tokens.issue(user.id)
  const useCase = new AuthenticationSessionRefreshUseCase(users, tokens)
  return { tokens, user, pair, useCase }
}

test.group('authentication > session > refresh (unit)', () => {
  test('when the refresh is valid, it spends it and returns a new pair; the second time is 401', async ({
    assert,
  }) => {
    const { tokens, user, pair, useCase } = await subject()

    const first = await useCase.execute({ refreshToken: pair.refreshToken })
    const again = await useCase.execute({ refreshToken: pair.refreshToken })

    assert.isTrue(first.isRight())
    assert.notEqual(
      first.isRight() && first.value.refreshToken,
      pair.refreshToken,
    )
    assert.containsSubset(again.value, {
      status: 401,
      code: 'REFRESH_TOKEN_INVALID',
    })
    // The spent refresh is gone; the old access token and the new pair remain.
    assert.equal(tokens.count(user.id), 3)
  })

  test('when the cookie did not come, it answers 401 REFRESH_TOKEN_MISSING', async ({
    assert,
  }) => {
    const { useCase } = await subject()

    const result = await useCase.execute({})

    assert.containsSubset(result.value, {
      status: 401,
      code: 'REFRESH_TOKEN_MISSING',
    })
  })

  test('when it is the access token or any value, it answers 401 REFRESH_TOKEN_INVALID', async ({
    assert,
  }) => {
    const { pair, useCase } = await subject()

    for (const refreshToken of [pair.accessToken, 'lixo']) {
      const result = await useCase.execute({ refreshToken })

      assert.containsSubset(result.value, {
        status: 401,
        code: 'REFRESH_TOKEN_INVALID',
      })
    }
  })

  test('when the account became inactive, it does not renew and does not spend the token', async ({
    assert,
  }) => {
    const { tokens, user, pair, useCase } = await subject({
      status: ACTIVE_STATUS.INACTIVE,
    })

    const result = await useCase.execute({ refreshToken: pair.refreshToken })

    assert.containsSubset(result.value, {
      status: 401,
      code: 'REFRESH_TOKEN_INVALID',
    })
    assert.equal(tokens.count(user.id), 2)
  })

  test('when the auth package hands over no token secret, it answers 500 AUTHENTICATION_SESSION_TOKEN_ISSUE_ERROR', async ({
    assert,
  }) => {
    const users = new UserMemoryRepository()
    const tokens = new RefusingSessionTokens(new SessionTokenMemoryRepository())
    const user = userDraft()
    await users.save(user)
    const held = present(await tokens.issue(user.id), 'the held pair')
    tokens.refuseFromNowOn()
    const useCase = new AuthenticationSessionRefreshUseCase(users, tokens)

    const result = await useCase.execute({ refreshToken: held.refreshToken })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'AUTHENTICATION_SESSION_TOKEN_ISSUE_ERROR',
    })
  })
})
