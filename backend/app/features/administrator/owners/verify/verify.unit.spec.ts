import { randomUUID } from 'node:crypto'

import { USER_ROLE } from '@aporta/shared'
import { test } from '@japa/runner'

import AdministratorOwnerVerifyUseCase from './verify.use-case.ts'

import UserMemoryRepository from '#repositories/user/user.memory.repository'
import ClockFake from '#services/clock/clock.fake'
import { userDraft } from '#tests/user-fixtures'

async function fresh(role: (typeof USER_ROLE)[keyof typeof USER_ROLE]) {
  const users = new UserMemoryRepository()
  const user = userDraft({ role })
  await users.save(user)

  return {
    users,
    user,
    useCase: new AdministratorOwnerVerifyUseCase(users, new ClockFake()),
  }
}

test.group('administrator > owners > verify (unit)', () => {
  test('when verified, the account carries the clock instant; repeating keeps the first', async ({
    assert,
  }) => {
    const { users, user, useCase } = await fresh(USER_ROLE.OWNER)

    const first = await useCase.execute({ id: user.id, verified: true })
    const again = await useCase.execute({ id: user.id, verified: true })

    if (first.isLeft() || again.isLeft()) return assert.fail('verify failed')

    assert.isTrue(first.value.verified)
    assert.equal(first.value.verifiedAt, again.value.verifiedAt)
    assert.deepEqual(
      (await users.findById(user.id))?.snapshot().verifiedAt,
      ClockFake.INSTANT,
    )
  })

  test('when unverified, the seal goes away, and unverifying twice is harmless', async ({
    assert,
  }) => {
    const { users, user, useCase } = await fresh(USER_ROLE.OWNER)
    await useCase.execute({ id: user.id, verified: true })

    const taken = await useCase.execute({ id: user.id, verified: false })
    const again = await useCase.execute({ id: user.id, verified: false })

    if (taken.isLeft() || again.isLeft()) return assert.fail('verify failed')

    assert.deepEqual(taken.value, {
      id: user.id,
      verified: false,
      verifiedAt: null,
    })
    assert.isNull((await users.findById(user.id))?.snapshot().verifiedAt)
  })

  test('when the account is staff, verifying answers 409 and unverifying still works', async ({
    assert,
  }) => {
    const { user, useCase } = await fresh(USER_ROLE.MODERATOR)

    const verified = await useCase.execute({ id: user.id, verified: true })
    const unverified = await useCase.execute({ id: user.id, verified: false })

    assert.containsSubset(verified.value, {
      status: 409,
      code: 'USER_NOT_VERIFIABLE',
    })
    assert.isTrue(unverified.isRight())
  })

  test('when the account does not exist, it answers 404 USER_NOT_FOUND', async ({
    assert,
  }) => {
    const { useCase } = await fresh(USER_ROLE.OWNER)

    const result = await useCase.execute({ id: randomUUID(), verified: true })

    assert.containsSubset(result.value, {
      status: 404,
      code: 'USER_NOT_FOUND',
    })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const users = new UserMemoryRepository()
    users.findById = () => Promise.reject(new Error('database down'))
    const useCase = new AdministratorOwnerVerifyUseCase(users, new ClockFake())

    const result = await useCase.execute({ id: randomUUID(), verified: true })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_OWNER_VERIFY_ERROR',
    })
  })
})
