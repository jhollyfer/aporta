import { ACTIVE_STATUS, USER_ROLE } from '@aporta/shared'
import { test } from '@japa/runner'

import AdministratorUserPaginateUseCase from './paginate.use-case.ts'

import UserMemoryRepository from '#repositories/user/user.memory.repository'
import { userDraft } from '#tests/user-fixtures'

async function fresh() {
  const users = new UserMemoryRepository()
  await users.save(userDraft({ name: 'Ana Dona', email: 'ana@mail.com' }))
  await users.save(
    userDraft({
      name: 'Beto Equipe',
      email: 'beto@mail.com',
      role: USER_ROLE.MODERATOR,
    }),
  )
  await users.save(
    userDraft({
      name: 'Carla Suspensa',
      email: 'carla@mail.com',
      status: ACTIVE_STATUS.INACTIVE,
    }),
  )

  return { users, useCase: new AdministratorUserPaginateUseCase(users) }
}

test.group('administrator > users > paginate (unit)', () => {
  test('when listing, answers the page with the allowlisted fields and never a password', async ({
    assert,
  }) => {
    const { useCase } = await fresh()

    const result = await useCase.execute({ sort: 'name', direction: 'asc' })

    if (result.isLeft()) return assert.fail('paginate failed')

    assert.deepEqual(
      result.value.data.map((each) => each.name),
      ['Ana Dona', 'Beto Equipe', 'Carla Suspensa'],
    )
    assert.equal(result.value.meta.total, 3)
    assert.sameMembers(Object.keys(result.value.data[0] ?? {}), [
      'id',
      'name',
      'email',
      'role',
      'status',
      'verifiedAt',
      'createdAt',
      'updatedAt',
    ])
  })

  test('when filtering by role and status, each narrows; the search matches name and email', async ({
    assert,
  }) => {
    const { useCase } = await fresh()

    const staff = await useCase.execute({ role: USER_ROLE.MODERATOR })
    const suspended = await useCase.execute({ status: ACTIVE_STATUS.INACTIVE })
    const byEmail = await useCase.execute({ search: 'beto@' })
    const byName = await useCase.execute({ search: 'dona' })

    if (
      staff.isLeft() ||
      suspended.isLeft() ||
      byEmail.isLeft() ||
      byName.isLeft()
    )
      return assert.fail('paginate failed')

    assert.deepEqual(
      staff.value.data.map((each) => each.name),
      ['Beto Equipe'],
    )
    assert.deepEqual(
      suspended.value.data.map((each) => each.name),
      ['Carla Suspensa'],
    )
    assert.deepEqual(
      byEmail.value.data.map((each) => each.name),
      ['Beto Equipe'],
    )
    assert.deepEqual(
      byName.value.data.map((each) => each.name),
      ['Ana Dona'],
    )
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const users = new UserMemoryRepository()
    users.paginate = () => Promise.reject(new Error('database down'))

    const result = await new AdministratorUserPaginateUseCase(users).execute({})

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_USER_PAGINATE_ERROR',
    })
  })
})
