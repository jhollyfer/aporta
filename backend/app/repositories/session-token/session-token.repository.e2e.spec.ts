import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import { UserFactory } from '#database/factories/user.factory'
import SessionTokenLucidRepository from '#repositories/session-token/session-token.lucid.repository'
import SessionTokenMemoryRepository from '#repositories/session-token/session-token.memory.repository'
import type SessionTokenRepository from '#repositories/session-token/session-token.repository'
import { resetDatabase } from '#tests/database-fixtures'

/**
 * The `SessionTokenRepository` contract test (`_standards/domain.md`
 * §5.4): the same cases on Lucid, against Postgres, and in memory.
 */
type Subject = { repository: SessionTokenRepository; userId(): Promise<string> }

const IMPLEMENTATIONS = {
  lucid: async () => ({
    repository: await app.container.make(SessionTokenLucidRepository),
    userId: async () => {
      const account = await UserFactory.create()
      return account.id
    },
  }),
  memory: async () => ({
    repository: await app.container.make(SessionTokenMemoryRepository),
    userId: () => Promise.resolve('a3f1c0de-0000-4000-8000-000000000001'),
  }),
} satisfies Record<string, () => Promise<Subject>>

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`SessionTokenRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('when issuing a pair, the access token is found only as access and the refresh only as refresh', async ({
      assert,
    }) => {
      const { repository, userId } = await make()
      const owner = await userId()

      const pair = await repository.issue(owner)

      assert.isNotNull(pair)
      if (!pair) return
      const access = await repository.findAccess(pair.accessToken)
      const refresh = await repository.findRefresh(pair.refreshToken)
      assert.equal(access?.userId, owner)
      assert.equal(refresh?.userId, owner)
      assert.isNull(await repository.findRefresh(pair.accessToken))
      assert.isNull(await repository.findAccess(pair.refreshToken))
    })

    test('when the value is unreadable, finds nothing', async ({ assert }) => {
      const { repository } = await make()

      assert.isNull(await repository.findAccess('lixo'))
      assert.isNull(await repository.findRefresh('lixo'))
    })

    test('when consuming a refresh twice, only the first call spends it', async ({
      assert,
    }) => {
      const { repository, userId } = await make()
      const pair = await repository.issue(await userId())
      const token = pair && (await repository.findRefresh(pair.refreshToken))
      assert.isNotNull(token)
      if (!token) return

      assert.isTrue(await repository.consume(token))
      assert.isFalse(await repository.consume(token))
      assert.isNull(await repository.findRefresh(pair?.refreshToken ?? ''))
    })

    test("when revoking another account's token, it stays", async ({
      assert,
    }) => {
      const { repository, userId } = await make()
      const owner = await userId()
      const pair = await repository.issue(owner)
      const token = pair && (await repository.findAccess(pair.accessToken))
      if (!token) return assert.fail('o token devia existir')

      await repository.revoke(
        'a3f1c0de-0000-4000-8000-0000000000ff',
        token.identifier,
      )
      assert.isNotNull(await repository.findAccess(pair?.accessToken ?? ''))

      await repository.revoke(owner, token.identifier)
      assert.isNull(await repository.findAccess(pair?.accessToken ?? ''))
    })
  })
}
