import { test } from '@japa/runner'

import AccountProfileShowUseCase from './show.use-case.ts'

import UserMemoryRepository from '#repositories/user/user.memory.repository'
import StorageFake from '#services/storage/storage.fake'
import { storageFile } from '#tests/repository-fixtures'
import { actorDraft, userDraft } from '#tests/user-fixtures'

test.group('account > profile > show (unit)', () => {
  test('when the session account exists, it returns it with the signed photo and without password', async ({
    assert,
  }) => {
    const users = new UserMemoryRepository()
    const avatar = storageFile()
    users.putAvatar(avatar)
    const user = userDraft({ avatarId: avatar.id })
    await users.save(user)
    const useCase = new AccountProfileShowUseCase(users, new StorageFake())

    const result = await useCase.execute({ actor: actorDraft({ id: user.id }) })

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.containsSubset(result.value, {
      id: user.id,
      avatar: { id: avatar.id, url: `fake://${avatar.path}` },
    })
    assert.notProperty(result.value, 'password')
  })

  test('when the account vanished mid-request, it is an unexpected failure (500)', async ({
    assert,
  }) => {
    const useCase = new AccountProfileShowUseCase(
      new UserMemoryRepository(),
      new StorageFake(),
    )

    const result = await useCase.execute({ actor: actorDraft() })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ACCOUNT_PROFILE_SHOW_ERROR',
    })
  })
})
