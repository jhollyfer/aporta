import { ACTIVE_STATUS, USER_ROLE } from '@aporta/shared'
import { test } from '@japa/runner'

import AdministratorStaffCreateUseCase from './create.use-case.ts'

import UserMemoryRepository from '#repositories/user/user.memory.repository'
import IdGeneratorFake from '#services/id-generator/id-generator.fake'
import { archived } from '#tests/repository-fixtures'
import { userDraft } from '#tests/user-fixtures'

const PAYLOAD = {
  name: 'Maria da Equipe',
  email: 'maria@aporta.com.br',
  password: 'Demo1234!',
  role: USER_ROLE.ADMINISTRATOR,
}

function subject() {
  const users = new UserMemoryRepository()
  const useCase = new AdministratorStaffCreateUseCase(
    users,
    new IdGeneratorFake(),
  )

  return { users, useCase }
}

test.group('administrator > staff > create (unit)', () => {
  test('when the email is free, it creates an active account with the asked role and the password hashed on save', async ({
    assert,
  }) => {
    const { users, useCase } = subject()

    const result = await useCase.execute(PAYLOAD)

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.equal(result.value.email, PAYLOAD.email)
    assert.equal(result.value.role, USER_ROLE.ADMINISTRATOR)
    const saved = await users.findById(result.value.id)
    assert.containsSubset(saved?.snapshot(), {
      role: USER_ROLE.ADMINISTRATOR,
      status: ACTIVE_STATUS.ACTIVE,
      deletedAt: null,
    })
    assert.isTrue(
      await users.passwordMatches(result.value.id, PAYLOAD.password),
    )
  })

  test('when the role is MODERATOR, the account is born a moderator', async ({
    assert,
  }) => {
    const { users, useCase } = subject()

    const result = await useCase.execute({
      ...PAYLOAD,
      role: USER_ROLE.MODERATOR,
    })

    if (result.isLeft()) return assert.fail(result.value.message)

    const saved = await users.findById(result.value.id)
    assert.equal(saved?.snapshot().role, USER_ROLE.MODERATOR)
  })

  test('when it succeeds, the answer never carries the password', async ({
    assert,
  }) => {
    const { useCase } = subject()

    const result = await useCase.execute(PAYLOAD)

    assert.notInclude(JSON.stringify(result.value), PAYLOAD.password)
  })

  test('when the email belongs to a live account, it answers 409 and saves nothing', async ({
    assert,
  }) => {
    const { users, useCase } = subject()
    await users.save(userDraft({ email: PAYLOAD.email }))

    const result = await useCase.execute(PAYLOAD)

    assert.containsSubset(result.value, {
      status: 409,
      code: 'USER_ALREADY_EXISTS',
    })
    assert.equal(await users.countAlive(), 1)
  })

  test('when the email belongs to an archived account, it answers 409 too and does not resurrect it', async ({
    assert,
  }) => {
    const { users, useCase } = subject()
    await archived(users, userDraft({ email: PAYLOAD.email }))

    const result = await useCase.execute(PAYLOAD)

    assert.containsSubset(result.value, {
      status: 409,
      code: 'USER_ALREADY_EXISTS',
    })
    assert.equal(await users.countAlive(), 0)
  })
})
