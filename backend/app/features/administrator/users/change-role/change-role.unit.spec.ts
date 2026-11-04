import { randomUUID } from 'node:crypto'

import { LISTING_STATUS, USER_ROLE } from '@aporta/shared'
import { test } from '@japa/runner'

import AdministratorUserChangeRoleUseCase from './change-role.use-case.ts'

import AdministratorUserAccess from '#features/administrator/_shared.user-access'
import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import UserMemoryRepository from '#repositories/user/user.memory.repository'
import { listingIn } from '#tests/listing-fixtures'
import { actorDraft, userDraft } from '#tests/user-fixtures'

async function fresh() {
  const users = new UserMemoryRepository()
  const listings = new ListingMemoryRepository()
  const admin = userDraft({ role: USER_ROLE.ADMINISTRATOR })
  await users.save(admin)

  return {
    users,
    listings,
    admin,
    actor: actorDraft({ id: admin.id, role: USER_ROLE.ADMINISTRATOR }),
    useCase: new AdministratorUserChangeRoleUseCase(
      users,
      new AdministratorUserAccess(users, listings),
    ),
  }
}

test.group('administrator > users > change-role (unit)', () => {
  test('when another account gets a new role, it answers the account with it and drops its sessions', async ({
    assert,
  }) => {
    const { users, actor, useCase } = await fresh()
    const target = userDraft({ role: USER_ROLE.OWNER })
    await users.save(target)
    users.openSession(target.id)

    const result = await useCase.execute({
      id: target.id,
      role: USER_ROLE.MODERATOR,
      actor,
    })

    if (result.isLeft()) return assert.fail('change-role failed')

    assert.equal(result.value.role, USER_ROLE.MODERATOR)
    assert.equal(users.sessions(target.id), 0)
    assert.equal(
      (await users.findById(target.id))?.snapshot().role,
      USER_ROLE.MODERATOR,
    )
  })

  test('when the administrator targets himself, answers 409 USER_OWN_ACCESS_CHANGE and keeps the role', async ({
    assert,
  }) => {
    const { users, admin, actor, useCase } = await fresh()
    await users.save(userDraft({ role: USER_ROLE.ADMINISTRATOR }))

    const result = await useCase.execute({
      id: admin.id,
      role: USER_ROLE.MODERATOR,
      actor,
    })

    assert.containsSubset(result.value, {
      status: 409,
      code: 'USER_OWN_ACCESS_CHANGE',
    })
    assert.equal(
      (await users.findById(admin.id))?.snapshot().role,
      USER_ROLE.ADMINISTRATOR,
    )
  })

  test('when the target is the only active administrator, answers 409 USER_LAST_ADMINISTRATOR', async ({
    assert,
  }) => {
    const users = new UserMemoryRepository()
    const lone = userDraft({ role: USER_ROLE.ADMINISTRATOR })
    await users.save(lone)

    // The actor is not in the repository (a session that outlived its demotion): the rule is the
    // last line of defense against two administrators demoting each other at once.
    const result = await new AdministratorUserChangeRoleUseCase(
      users,
      new AdministratorUserAccess(users, new ListingMemoryRepository()),
    ).execute({
      id: lone.id,
      role: USER_ROLE.OWNER,
      actor: actorDraft({ id: randomUUID(), role: USER_ROLE.ADMINISTRATOR }),
    })

    assert.containsSubset(result.value, {
      status: 409,
      code: 'USER_LAST_ADMINISTRATOR',
    })
    assert.equal(
      (await users.findById(lone.id))?.snapshot().role,
      USER_ROLE.ADMINISTRATOR,
    )
  })

  test('when an owner has a live ad, answers 409 USER_OWNS_LISTINGS; after the ad is archived, it passes', async ({
    assert,
  }) => {
    const { users, listings, actor, useCase } = await fresh()
    const owner = userDraft({ role: USER_ROLE.OWNER })
    await users.save(owner)
    listings.put(listingIn(LISTING_STATUS.PUBLISHED, { ownerId: owner.id }))
    const trashed = userDraft({ role: USER_ROLE.OWNER })
    await users.save(trashed)
    listings.put(
      listingIn(
        LISTING_STATUS.ARCHIVED,
        { ownerId: trashed.id },
        new Date('2026-10-01T12:00:00Z'),
      ),
    )

    const refused = await useCase.execute({
      id: owner.id,
      role: USER_ROLE.MODERATOR,
      actor,
    })
    const passes = await useCase.execute({
      id: trashed.id,
      role: USER_ROLE.MODERATOR,
      actor,
    })

    assert.containsSubset(refused.value, {
      status: 409,
      code: 'USER_OWNS_LISTINGS',
    })
    assert.isTrue(passes.isRight())
  })

  test('when the account does not exist, answers 404 USER_NOT_FOUND', async ({
    assert,
  }) => {
    const { actor, useCase } = await fresh()

    const result = await useCase.execute({
      id: randomUUID(),
      role: USER_ROLE.OWNER,
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
      role: USER_ROLE.OWNER,
      actor,
    })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_USER_CHANGE_ROLE_ERROR',
    })
  })
})
