import { test } from '@japa/runner'

import AccountProfileUpdateUseCase from './update.use-case.ts'

import Translation from '#core/translation'
import StorageMemoryRepository from '#repositories/storage/storage.memory.repository'
import UserMemoryRepository from '#repositories/user/user.memory.repository'
import StorageFake from '#services/storage/storage.fake'
import { archived, storageFile } from '#tests/repository-fixtures'
import { USER_INPUT, actorDraft, userDraft } from '#tests/user-fixtures'

/** The session account, saved with the default password and an open session. */
async function subject() {
  const users = new UserMemoryRepository()
  const user = userDraft({ email: 'ana@mail.com' })
  await users.save(user)
  users.openSession(user.id)
  const useCase = new AccountProfileUpdateUseCase(
    users,
    new StorageMemoryRepository(),
    new StorageFake(),
  )
  const actor = actorDraft({ id: user.id, email: 'ana@mail.com' })
  return { users, user, actor, useCase }
}

test.group('account > profile > update (unit)', () => {
  test('when only the name changes, it saves and the session stays', async ({
    assert,
  }) => {
    const { users, user, actor, useCase } = await subject()

    const result = await useCase.execute({ actor, name: 'Bia' })

    assert.containsSubset(result.value, { name: 'Bia' })
    assert.equal(users.sessions(user.id), 1)
  })

  test('when changing the password with the right current one, it saves and drops the sessions', async ({
    assert,
  }) => {
    const { users, user, actor, useCase } = await subject()

    const result = await useCase.execute({
      actor,
      currentPassword: USER_INPUT.password,
      password: 'Nova1234!',
    })

    assert.isTrue(result.isRight())
    assert.isTrue(await users.passwordMatches(user.id, 'Nova1234!'))
    assert.equal(users.sessions(user.id), 0)
  })

  test('when the current password is wrong or missing, it answers 422 CURRENT_PASSWORD_INVALID', async ({
    assert,
  }) => {
    const { users, user, actor, useCase } = await subject()

    for (const currentPassword of ['Errada123!', undefined]) {
      const result = await useCase.execute({
        actor,
        currentPassword,
        password: 'Nova1234!',
      })

      assert.containsSubset(result.value, {
        status: 422,
        code: 'CURRENT_PASSWORD_INVALID',
        errors: {
          currentPassword: Translation.t('fields.CURRENT_PASSWORD_INVALID'),
        },
      })
    }
    assert.isTrue(await users.passwordMatches(user.id, USER_INPUT.password))
    assert.equal(users.sessions(user.id), 1)
  })

  test('when the new one equals the current one, it answers 422 PASSWORD_SAME_AS_CURRENT', async ({
    assert,
  }) => {
    const { actor, useCase } = await subject()

    const result = await useCase.execute({
      actor,
      currentPassword: USER_INPUT.password,
      password: USER_INPUT.password,
    })

    assert.containsSubset(result.value, {
      status: 422,
      code: 'PASSWORD_SAME_AS_CURRENT',
    })
  })

  test('when the new email belongs to another account, even archived, it answers 409', async ({
    assert,
  }) => {
    const { users, user, actor, useCase } = await subject()
    await archived(users, userDraft({ email: 'outra@mail.com' }))

    const result = await useCase.execute({ actor, email: 'outra@mail.com' })

    assert.containsSubset(result.value, {
      status: 409,
      code: 'USER_ALREADY_EXISTS',
      errors: { email: Translation.t('fields.PROFILE_USER_ALREADY_EXISTS') },
    })
    const stored = await users.findById(user.id)
    assert.equal(stored?.snapshot().email, 'ana@mail.com')
  })

  test('when the photo does not exist, it answers 422 STORAGE_NOT_FOUND', async ({
    assert,
  }) => {
    const { actor, useCase } = await subject()

    const result = await useCase.execute({
      actor,
      avatarId: storageFile().id,
    })

    assert.containsSubset(result.value, {
      status: 422,
      code: 'STORAGE_NOT_FOUND',
    })
  })
})
