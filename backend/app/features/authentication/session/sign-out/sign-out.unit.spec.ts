import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import AuthenticationSessionSignOutUseCase from './sign-out.use-case.ts'

import SessionTokenMemoryRepository from '#repositories/session-token/session-token.memory.repository'
import { actorDraft } from '#tests/user-fixtures'

test.group('authentication > session > sign-out (unit)', () => {
  test('when signing out, it deletes the access token and the own account refresh', async ({
    assert,
  }) => {
    const tokens = new SessionTokenMemoryRepository()
    const actor = actorDraft()
    const pair = await tokens.issue(actor.id)
    const useCase = new AuthenticationSessionSignOutUseCase(tokens)

    const result = await useCase.execute({
      actor,
      accessTokenId: pair.accessToken,
      refreshToken: pair.refreshToken,
    })

    assert.isTrue(result.isRight())
    assert.equal(tokens.count(actor.id), 0)
  })

  test('when the refresh is unreadable or of another account, it signs out anyway and does not delete it', async ({
    assert,
  }) => {
    const tokens = new SessionTokenMemoryRepository()
    const actor = actorDraft()
    const other = randomUUID()
    const mine = await tokens.issue(actor.id)
    const theirs = await tokens.issue(other)
    const useCase = new AuthenticationSessionSignOutUseCase(tokens)

    for (const refreshToken of ['lixo', theirs.refreshToken]) {
      const result = await useCase.execute({
        actor,
        accessTokenId: mine.accessToken,
        refreshToken,
      })

      assert.isTrue(result.isRight())
    }
    assert.equal(tokens.count(other), 2)
  })
})
