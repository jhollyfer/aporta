import { ACTIVE_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import AuthenticationSessionSignInUseCase from './sign-in.use-case.ts'

import Translation from '#core/translation'
import SessionTokenMemoryRepository from '#repositories/session-token/session-token.memory.repository'
import UserMemoryRepository from '#repositories/user/user.memory.repository'
import { archived } from '#tests/repository-fixtures'
import { RefusingSessionTokens } from '#tests/session-token-fixtures'
import { USER_INPUT, userDraft } from '#tests/user-fixtures'

const INVALID = {
  status: 401,
  code: 'INVALID_CREDENTIALS',
  errors: { root: Translation.t('fields.INVALID_CREDENTIALS') },
}

test.group('authentication > session > sign-in (unit)', () => {
  test('when the credentials match and the account is active, it issues the token pair of the account', async ({
    assert,
  }) => {
    const users = new UserMemoryRepository()
    const tokens = new SessionTokenMemoryRepository()
    const user = userDraft({ email: 'ana@mail.com' })
    await users.save(user)
    const useCase = new AuthenticationSessionSignInUseCase(users, tokens)

    const result = await useCase.execute({
      email: 'ana@mail.com',
      password: USER_INPUT.password,
    })

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.isString(result.value.accessToken)
    assert.isString(result.value.refreshToken)
    assert.equal(tokens.count(user.id), 2)
  })

  test('when the credentials are wrong, it issues nothing', async ({
    assert,
  }) => {
    const users = new UserMemoryRepository()
    const tokens = new SessionTokenMemoryRepository()
    const user = userDraft({ email: 'ana@mail.com' })
    await users.save(user)
    const useCase = new AuthenticationSessionSignInUseCase(users, tokens)

    await useCase.execute({ email: 'ana@mail.com', password: 'Errada123!' })

    assert.equal(tokens.count(user.id), 0)
  })

  test('when the auth package hands over no token secret, it answers 500 AUTHENTICATION_SESSION_TOKEN_ISSUE_ERROR', async ({
    assert,
  }) => {
    const users = new UserMemoryRepository()
    await users.save(userDraft({ email: 'ana@mail.com' }))
    const tokens = new RefusingSessionTokens(new SessionTokenMemoryRepository())
    tokens.refuseFromNowOn()
    const useCase = new AuthenticationSessionSignInUseCase(users, tokens)

    const result = await useCase.execute({
      email: 'ana@mail.com',
      password: USER_INPUT.password,
    })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'AUTHENTICATION_SESSION_TOKEN_ISSUE_ERROR',
    })
  })

  test('when the password is wrong, the email does not exist, the account is inactive or archived, it answers the same 401', async ({
    assert,
  }) => {
    const users = new UserMemoryRepository()
    await users.save(userDraft({ email: 'ana@mail.com' }))
    await users.save(
      userDraft({ email: 'inativa@mail.com', status: ACTIVE_STATUS.INACTIVE }),
    )
    await archived(users, userDraft({ email: 'arquivada@mail.com' }))
    const useCase = new AuthenticationSessionSignInUseCase(
      users,
      new SessionTokenMemoryRepository(),
    )

    for (const [email, password] of [
      ['ana@mail.com', 'Errada123!'],
      ['nenhuma@mail.com', USER_INPUT.password],
      ['inativa@mail.com', USER_INPUT.password],
      ['arquivada@mail.com', USER_INPUT.password],
    ] as const) {
      const result = await useCase.execute({ email, password })

      assert.containsSubset(result.value, INVALID)
    }
  })
})
