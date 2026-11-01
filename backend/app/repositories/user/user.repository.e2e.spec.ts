import { randomUUID } from 'node:crypto'

import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import {
  ACTIVE_STATUS,
  SORT_DIRECTION,
  TRASHED_MODE,
  USER_ROLE,
} from '@aporta/shared'
import { test } from '@japa/runner'

import User from '#domain/user/user.entity'
import UserModel, { ACCESS_TOKEN_TABLE } from '#models/user'
import UserLucidRepository from '#repositories/user/user.lucid.repository'
import UserMemoryRepository from '#repositories/user/user.memory.repository'
import type UserRepository from '#repositories/user/user.repository'
import { resetDatabase, storageRecord } from '#tests/database-fixtures'
import { archived, storageFile, recorded } from '#tests/repository-fixtures'
import { userDraft } from '#tests/user-fixtures'

/**
 * The `UserRepository` contract test (`_standards/domain.md` §5.4): the
 * same cases on Lucid, against Postgres, and in memory. Each implementation
 * says how to seed a photo and an open session, and how to count the sessions: in
 * Lucid, rows of `auth_access_tokens`; in memory, the counter alongside.
 */
type Subject = {
  repository: UserRepository
  avatar(): Promise<string>
  openSession(userId: string): Promise<void>
  sessions(userId: string): Promise<number>
}

const IMPLEMENTATIONS = {
  lucid: async () => ({
    repository: await app.container.make(UserLucidRepository),
    avatar: async () => {
      const storage = await storageRecord({ originalName: 'foto.png' })
      return storage.id
    },
    openSession: async (userId: string) => {
      const owner = await UserModel.findOrFail(userId)
      await UserModel.accessTokens.create(owner)
    },
    sessions: async (userId: string) => {
      const rows = await db
        .from(ACCESS_TOKEN_TABLE)
        .where('tokenable_id', userId)
        .select('id')
      return rows.length
    },
  }),
  memory: async () => {
    const repository = await app.container.make(UserMemoryRepository)
    return {
      repository,
      avatar: () => {
        const file = storageFile()
        repository.putAvatar(file)
        return Promise.resolve(file.id)
      },
      openSession: (userId: string) =>
        Promise.resolve(repository.openSession(userId)),
      sessions: (userId: string) =>
        Promise.resolve(repository.sessions(userId)),
    }
  },
} satisfies Record<string, () => Promise<Subject>>

const PAGE = {
  page: 1,
  perPage: 20,
  sort: 'name',
  direction: SORT_DIRECTION.ASC,
} as const

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`UserRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('when saving a new one, it returns it as it ended up: ACTIVE, stamped, without photo', async ({
      assert,
    }) => {
      const { repository } = await make()
      const user = userDraft()

      const saved = recorded(await repository.save(user))
      const snapshot = saved.user.snapshot()

      assert.equal(snapshot.status, ACTIVE_STATUS.ACTIVE)
      assert.isNull(saved.avatar)
      assert.instanceOf(saved.createdAt, Date)
      assert.deepEqual(saved.user.credentials(), {
        password: null,
        revokeSessions: false,
      })
      const found = await repository.findById(user.id)
      assert.deepEqual(found?.snapshot(), snapshot)
    })

    test('when saving without change, updatedAt does not change', async ({
      assert,
    }) => {
      const { repository } = await make()
      const first = recorded(await repository.save(userDraft()))

      const again = recorded(await repository.save(first.user))

      assert.equal(again.updatedAt?.getTime(), first.updatedAt?.getTime())
    })

    test('when the entity asks, the sessions drop along with the save; when not, they stay', async ({
      assert,
    }) => {
      const { repository, openSession, sessions } = await make()
      const user = userDraft()
      await repository.save(user)
      await openSession(user.id)
      await openSession(user.id)

      const kept = await repository.findById(user.id)
      kept?.update({ name: 'Outra' })
      if (kept) await repository.save(kept)
      assert.equal(await sessions(user.id), 2)

      const changed = await repository.findById(user.id)
      changed?.update({ password: 'Nova1234!' })
      if (changed) await repository.save(changed)
      assert.equal(await sessions(user.id), 0)
    })

    test('when checking the password, only the saved one passes, and the change holds on the next read', async ({
      assert,
    }) => {
      const { repository } = await make()
      const user = userDraft({ password: 'Velha1234!' })
      await repository.save(user)

      assert.isTrue(await repository.passwordMatches(user.id, 'Velha1234!'))
      assert.isFalse(await repository.passwordMatches(user.id, 'Outra1234!'))
      assert.isFalse(await repository.passwordMatches(randomUUID(), 'x'))

      const stored = await repository.findById(user.id)
      stored?.update({ password: 'Nova1234!' })
      if (stored) await repository.save(stored)

      assert.isTrue(await repository.passwordMatches(user.id, 'Nova1234!'))
      assert.isFalse(await repository.passwordMatches(user.id, 'Velha1234!'))
    })

    test('when checking credentials, only the right email and password find the account, live or not', async ({
      assert,
    }) => {
      const { repository } = await make()
      const user = userDraft({
        email: 'login@mail.com',
        password: 'Certa1234!',
      })
      await archived(repository, user)

      const found = await repository.findByCredentials(
        'login@mail.com',
        'Certa1234!',
      )
      const wrong = await repository.findByCredentials(
        'login@mail.com',
        'Errada123!',
      )
      const missing = await repository.findByCredentials(
        'nenhum@mail.com',
        'Certa1234!',
      )

      assert.isTrue(found.isRight())
      assert.equal(found.value instanceof User && found.value.id, user.id)
      assert.isFalse(
        found.value instanceof User && found.value.canOpenSession(),
      )
      assert.isNull(wrong.value)
      assert.isNull(missing.value)
    })

    test('when looking up by email, it reaches the archived one; existsByEmail ignores its own', async ({
      assert,
    }) => {
      const { repository } = await make()
      const alive = userDraft({ email: 'viva@mail.com' })
      const trashed = userDraft({ email: 'arquivada@mail.com' })
      await repository.save(alive)
      await archived(repository, trashed)

      const byEmail = await repository.findByEmail('arquivada@mail.com')
      assert.equal(byEmail?.id, trashed.id)
      assert.isNull(await repository.findByEmail('nenhuma@mail.com'))
      assert.isTrue(
        await repository.existsByEmail('arquivada@mail.com', alive.id),
      )
      assert.isFalse(await repository.existsByEmail('viva@mail.com', alive.id))
    })

    test('when saving another with the same email, returns the UNIQUE_CONFLICT fact', async ({
      assert,
    }) => {
      const { repository } = await make()
      await repository.save(userDraft({ email: 'repetida@mail.com' }))

      const again = await repository.save(
        userDraft({ email: 'repetida@mail.com' }),
      )

      assert.isTrue(again.isLeft())
      assert.deepEqual(again.value, { code: 'UNIQUE_CONFLICT' })
    })

    test('when in the trash, only findById with trashed finds it; with a photo, findRecord returns it', async ({
      assert,
    }) => {
      const { repository, avatar } = await make()
      const avatarId = await avatar()
      const alive = userDraft({ avatarId })
      const trashed = userDraft()
      await repository.save(alive)
      await archived(repository, trashed)

      assert.isNull(await repository.findById(trashed.id))
      assert.isNotNull(await repository.findById(trashed.id, TRASHED_MODE.ONLY))
      assert.isNull(await repository.findById(randomUUID()))
      assert.isNull(await repository.findRecord(trashed.id))
      const record = await repository.findRecord(alive.id)
      assert.equal(record?.avatar?.id, avatarId)
    })

    test('when paginating, it filters by role, status, search and trash', async ({
      assert,
    }) => {
      const { repository } = await make()
      await repository.save(
        userDraft({ name: 'Ana', email: 'robot@pagina.com' }),
      )
      await repository.save(
        userDraft({
          name: 'Bia',
          email: 'bia@pagina.com',
          role: USER_ROLE.ADMINISTRATOR,
          status: ACTIVE_STATUS.INACTIVE,
        }),
      )
      await archived(
        repository,
        userDraft({ name: 'Caio', email: 'caio@pagina.com' }),
      )

      // The test database already has the seeder administrator: this spec's cut
      // is the `@pagina.com` domain.
      const names = async (criteria: object) => {
        const page = await repository.paginate({
          ...PAGE,
          search: 'pagina',
          ...criteria,
        })
        return page.data.map((item) => item.user.snapshot().name)
      }

      assert.deepEqual(await names({}), ['Ana', 'Bia'])
      assert.deepEqual(await names({ role: USER_ROLE.ADMINISTRATOR }), ['Bia'])
      assert.deepEqual(await names({ status: ACTIVE_STATUS.INACTIVE }), ['Bia'])
      assert.deepEqual(await names({ search: 'ROBOT' }), ['Ana'])
      assert.deepEqual(await names({ trashed: TRASHED_MODE.ONLY }), ['Caio'])
      assert.deepEqual(
        await names({ direction: SORT_DIRECTION.DESC, perPage: 1 }),
        ['Bia'],
      )
    })

    test('when counting, only those outside the trash count', async ({
      assert,
    }) => {
      const { repository } = await make()
      const before = await repository.countAlive()
      await repository.save(userDraft())
      await repository.save(userDraft())
      await archived(repository, userDraft())

      assert.equal(await repository.countAlive(), before + 2)
    })

    test('when deleting, no read finds it and the sessions go along', async ({
      assert,
    }) => {
      const { repository, openSession, sessions } = await make()
      const user = userDraft()
      await repository.save(user)
      await openSession(user.id)
      await archived(repository, user)
      await openSession(user.id)

      await repository.delete(user)

      assert.isNull(await repository.findById(user.id, TRASHED_MODE.WITH))
      assert.equal(await sessions(user.id), 0)
    })
  })
}
