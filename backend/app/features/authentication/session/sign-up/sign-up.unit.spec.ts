import { USER_ROLE, ACTIVE_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import AuthenticationSessionSignUpUseCase from './sign-up.use-case.ts'

import Translation from '#core/translation'
import UserMemoryRepository from '#repositories/user/user.memory.repository'
import IdGeneratorFake from '#services/id-generator/id-generator.fake'
import { archived } from '#tests/repository-fixtures'
import { USER_INPUT, userDraft } from '#tests/user-fixtures'

const PAYLOAD = {
  name: 'Seu Raimundo',
  email: 'raimundo@mail.com',
  password: 'Demo1234!',
}

function subject() {
  const users = new UserMemoryRepository()
  const useCase = new AuthenticationSessionSignUpUseCase(
    users,
    new IdGeneratorFake(),
  )

  return { users, useCase }
}

test.group('authentication > session > sign-up (unit)', () => {
  test('when the email is free, it creates an active OWNER and answers the profile', async ({
    assert,
  }) => {
    const { users, useCase } = subject()

    const result = await useCase.execute(PAYLOAD)

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.containsSubset(result.value, {
      name: PAYLOAD.name,
      email: PAYLOAD.email,
      role: USER_ROLE.OWNER,
      status: ACTIVE_STATUS.ACTIVE,
      avatarId: null,
      avatar: null,
      deletedAt: null,
    })
    assert.isTrue(
      await users.passwordMatches(result.value.id, PAYLOAD.password),
    )
  })

  test('when it creates the account, it opens no session', async ({
    assert,
  }) => {
    const { users, useCase } = subject()

    const result = await useCase.execute(PAYLOAD)

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.equal(users.sessions(result.value.id), 0)
  })

  test('when the email belongs to a live account, it answers 409 USER_ALREADY_EXISTS and saves nothing', async ({
    assert,
  }) => {
    const { users, useCase } = subject()
    await users.save(userDraft({ email: PAYLOAD.email }))

    const result = await useCase.execute(PAYLOAD)

    assert.containsSubset(result.value, {
      status: 409,
      code: 'USER_ALREADY_EXISTS',
      errors: { email: Translation.t('fields.PROFILE_USER_ALREADY_EXISTS') },
    })
    assert.equal(await users.countAlive(), 1)
  })

  test('when the email belongs to an archived account, it answers 409 too', async ({
    assert,
  }) => {
    const { users, useCase } = subject()
    await archived(users, userDraft({ email: PAYLOAD.email }))

    const result = await useCase.execute(PAYLOAD)

    assert.containsSubset(result.value, {
      status: 409,
      code: 'USER_ALREADY_EXISTS',
    })
  })

  test('when the password is the default one of another account, it still creates its own', async ({
    assert,
  }) => {
    const { users, useCase } = subject()
    await users.save(userDraft({ email: 'ana@mail.com' }))

    const result = await useCase.execute({
      ...PAYLOAD,
      password: USER_INPUT.password,
    })

    assert.isTrue(result.isRight())
    assert.equal(await users.countAlive(), 2)
  })
})
