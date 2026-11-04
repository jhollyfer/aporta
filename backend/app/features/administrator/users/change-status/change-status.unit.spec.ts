import { randomUUID } from 'node:crypto'

import { ACTIVE_STATUS, USER_ROLE } from '@aporta/shared'
import { test } from '@japa/runner'

import AdministratorUserChangeStatusUseCase from './change-status.use-case.ts'

import AdministratorUserAccess from '#features/administrator/_shared.user-access'
import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import UserMemoryRepository from '#repositories/user/user.memory.repository'
import { actorDraft, userDraft } from '#tests/user-fixtures'

function useCaseOver(users: UserMemoryRepository) {
  return new AdministratorUserChangeStatusUseCase(
    users,
    new AdministratorUserAccess(users, new ListingMemoryRepository()),
  )
}

async function fresh() {
  const users = new UserMemoryRepository()
  const admin = userDraft({ role: USER_ROLE.ADMINISTRATOR })
  await users.save(admin)

  return {
    users,
    admin,
    actor: actorDraft({ id: admin.id, role: USER_ROLE.ADMINISTRATOR }),
    useCase: useCaseOver(users),
  }
}

test.group('administrator > users > change-status (unit)', () => {
  test('when suspended, the account goes INACTIVE and its sessions drop; reactivated, it is ACTIVE again', async ({
    assert,
  }) => {
    const { users, actor, useCase } = await fresh()
    const target = userDraft()
    await users.save(target)
    users.openSession(target.id)

    const suspended = await useCase.execute({
      id: target.id,
      status: ACTIVE_STATUS.INACTIVE,
      actor,
    })
    const sessionsAfter = users.sessions(target.id)
    const back = await useCase.execute({
      id: target.id,
      status: ACTIVE_STATUS.ACTIVE,
      actor,
    })

    if (suspended.isLeft() || back.isLeft())
      return assert.fail('change-status failed')

    assert.equal(suspended.value.status, ACTIVE_STATUS.INACTIVE)
    assert.equal(sessionsAfter, 0)
    assert.equal(back.value.status, ACTIVE_STATUS.ACTIVE)
  })

  test('when the administrator suspends himself, answers 409 USER_OWN_ACCESS_CHANGE', async ({
    assert,
  }) => {
    const { users, admin, actor, useCase } = await fresh()

    const result = await useCase.execute({
      id: admin.id,
      status: ACTIVE_STATUS.INACTIVE,
      actor,
    })

    assert.containsSubset(result.value, {
      status: 409,
      code: 'USER_OWN_ACCESS_CHANGE',
    })
    assert.equal(
      (await users.findById(admin.id))?.snapshot().status,
      ACTIVE_STATUS.ACTIVE,
    )
  })

  test('when the target is the only active administrator, answers 409 USER_LAST_ADMINISTRATOR', async ({
    assert,
  }) => {
    const users = new UserMemoryRepository()
    const lone = userDraft({ role: USER_ROLE.ADMINISTRATOR })
    await users.save(lone)

    // The actor is not in the repository (a session that outlived its demotion): the rule is the
    // last line of defense against two administrators taking each other out at once.
    const result = await useCaseOver(users).execute({
      id: lone.id,
      status: ACTIVE_STATUS.INACTIVE,
      actor: actorDraft({ id: randomUUID(), role: USER_ROLE.ADMINISTRATOR }),
    })

    assert.containsSubset(result.value, {
      status: 409,
      code: 'USER_LAST_ADMINISTRATOR',
    })
  })

  test('when the account does not exist, answers 404 USER_NOT_FOUND', async ({
    assert,
  }) => {
    const { actor, useCase } = await fresh()

    const result = await useCase.execute({
      id: randomUUID(),
      status: ACTIVE_STATUS.INACTIVE,
      actor,
    })

    assert.containsSubset(result.value, { status: 404, code: 'USER_NOT_FOUND' })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const { users, actor, useCase } = await fresh()
    users.findById = () => Promise.reject(new Error('database down'))

    const result = await useCase.execute({
      id: randomUUID(),
      status: ACTIVE_STATUS.INACTIVE,
      actor,
    })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_USER_CHANGE_STATUS_ERROR',
    })
  })
})
