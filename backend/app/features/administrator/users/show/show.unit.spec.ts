import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import AdministratorUserShowUseCase from './show.use-case.ts'

import UserMemoryRepository from '#repositories/user/user.memory.repository'
import { archived } from '#tests/repository-fixtures'
import { userDraft } from '#tests/user-fixtures'

test.group('administrator > users > show (unit)', () => {
  test('when the account exists, answers it by allowlist', async ({
    assert,
  }) => {
    const users = new UserMemoryRepository()
    const user = userDraft({ name: 'Ana' })
    await users.save(user)

    const result = await new AdministratorUserShowUseCase(users).execute({
      id: user.id,
    })

    if (result.isLeft()) return assert.fail('show failed')

    assert.containsSubset(result.value, {
      id: user.id,
      name: 'Ana',
      role: 'OWNER',
      status: 'ACTIVE',
    })
    assert.notProperty(result.value, 'password')
  })

  test('when the id is unknown or the account is archived, answers 404 USER_NOT_FOUND', async ({
    assert,
  }) => {
    const users = new UserMemoryRepository()
    const gone = userDraft()
    await archived(users, gone)
    const useCase = new AdministratorUserShowUseCase(users)

    const unknown = await useCase.execute({ id: randomUUID() })
    const trashed = await useCase.execute({ id: gone.id })

    assert.containsSubset(unknown.value, {
      status: 404,
      code: 'USER_NOT_FOUND',
    })
    assert.containsSubset(trashed.value, {
      status: 404,
      code: 'USER_NOT_FOUND',
    })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const users = new UserMemoryRepository()
    users.findRecord = () => Promise.reject(new Error('database down'))

    const result = await new AdministratorUserShowUseCase(users).execute({
      id: randomUUID(),
    })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_USER_SHOW_ERROR',
    })
  })
})
