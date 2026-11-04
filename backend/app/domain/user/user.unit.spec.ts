import { ACTIVE_STATUS, USER_ROLE } from '@aporta/shared'
import { test } from '@japa/runner'

import User, { type AccessChangeContext } from '#domain/user/user.entity'
import { ARCHIVED_AT } from '#tests/repository-fixtures'
import { USER_INPUT, userDraft } from '#tests/user-fixtures'

/** The account as the repository returns it: with no pending password or sessions to drop. */
function stored(input: Parameters<typeof userDraft>[0] = {}): User {
  return User.restore(userDraft(input).snapshot())
}

test.group('domain > user > create', () => {
  test('when created without status, it is born ACTIVE and carries the password to the save', ({
    assert,
  }) => {
    const user = userDraft()

    assert.equal(user.snapshot().status, ACTIVE_STATUS.ACTIVE)
    assert.notProperty(user.snapshot(), 'password')
    assert.deepEqual(user.credentials(), {
      password: USER_INPUT.password,
      revokeSessions: false,
    })
  })

  test('when rehydrated, it carries no password nor asks for a session drop', ({
    assert,
  }) => {
    assert.deepEqual(stored().credentials(), {
      password: null,
      revokeSessions: false,
    })
  })
})

test.group('domain > user > update', () => {
  test('when only the name changes, the sessions stay', ({ assert }) => {
    const user = stored()

    user.update({ name: 'Bia' })

    assert.equal(user.snapshot().name, 'Bia')
    assert.isFalse(user.credentials().revokeSessions)
  })

  test('when the status becomes INACTIVE, it drops the sessions; staying ACTIVE keeps them', ({
    assert,
  }) => {
    const user = stored()

    user.update({ status: ACTIVE_STATUS.ACTIVE })
    assert.isFalse(user.credentials().revokeSessions)

    user.update({ status: ACTIVE_STATUS.INACTIVE })
    assert.isTrue(user.credentials().revokeSessions)
    assert.equal(user.snapshot().status, ACTIVE_STATUS.INACTIVE)
  })

  test('when the role changes, it drops the sessions; sending the same role keeps them', ({
    assert,
  }) => {
    const user = stored({ role: USER_ROLE.OWNER })

    user.update({ role: USER_ROLE.OWNER })
    assert.isFalse(user.credentials().revokeSessions)

    user.update({ role: USER_ROLE.ADMINISTRATOR })
    assert.isTrue(user.credentials().revokeSessions)
    assert.equal(user.snapshot().role, USER_ROLE.ADMINISTRATOR)
  })

  test('when resending the same email, the sessions stay; a new email drops them', ({
    assert,
  }) => {
    const user = stored({ email: 'ana@mail.com' })

    user.update({ email: 'ana@mail.com' })
    assert.isFalse(user.credentials().revokeSessions)

    user.update({ email: 'bia@mail.com' })
    assert.isTrue(user.credentials().revokeSessions)
    assert.equal(user.snapshot().email, 'bia@mail.com')
  })

  test('when changing the password, it carries the new one and drops the sessions', ({
    assert,
  }) => {
    const user = stored()

    user.update({ password: 'Nova1234!' })

    assert.deepEqual(user.credentials(), {
      password: 'Nova1234!',
      revokeSessions: true,
    })
  })
})

test.group('domain > user > trash', () => {
  test('when archiving, it records the instant and drops the sessions; again, it refuses', ({
    assert,
  }) => {
    const user = stored()

    assert.isTrue(user.archive(ARCHIVED_AT).isRight())
    assert.isTrue(user.credentials().revokeSessions)
    assert.deepEqual(user.archive(new Date()).value, {
      code: 'USER_ALREADY_ARCHIVED',
    })
  })

  test('when restoring a live one, it refuses with USER_NOT_ARCHIVED; the archived one comes back', ({
    assert,
  }) => {
    const user = stored()

    assert.deepEqual(user.unarchive().value, { code: 'USER_NOT_ARCHIVED' })

    user.archive(ARCHIVED_AT)

    assert.isTrue(user.unarchive().isRight())
  })

  test('when reusing the archived one, it comes back with the new data; the live one refuses', ({
    assert,
  }) => {
    const alive = stored()
    assert.deepEqual(alive.revive({ name: 'X' }).value, {
      code: 'USER_NOT_ARCHIVED',
    })

    const user = stored()
    user.archive(ARCHIVED_AT)

    assert.isTrue(
      user.revive({ name: 'Nova', password: 'Nova1234!' }).isRight(),
    )
    assert.isNull(user.snapshot().deletedAt)
    assert.equal(user.snapshot().name, 'Nova')
    assert.equal(user.credentials().password, 'Nova1234!')
  })

  test('when not archived, it cannot be deleted; when archived, it can', ({
    assert,
  }) => {
    const user = stored()

    assert.deepEqual(user.deletable().value, { code: 'USER_NOT_ARCHIVED' })

    user.archive(ARCHIVED_AT)

    assert.isTrue(user.deletable().isRight())
  })
})

test.group('domain > user > session', () => {
  test('when live and ACTIVE, it may open a session; inactive or archived, it may not', ({
    assert,
  }) => {
    assert.isTrue(stored().canOpenSession())
    assert.isFalse(stored({ status: ACTIVE_STATUS.INACTIVE }).canOpenSession())

    const archivedUser = stored()
    archivedUser.archive(ARCHIVED_AT)
    assert.isFalse(archivedUser.canOpenSession())
  })
})

test.group('domain > user > verification', () => {
  const AT = new Date('2026-11-01T12:00:00.000Z')

  test('when an owner account is verified, it carries the instant; verifying again keeps the first', ({
    assert,
  }) => {
    const user = stored({ role: USER_ROLE.OWNER })

    assert.isNull(user.snapshot().verifiedAt)
    assert.isTrue(user.verify(AT).isRight())
    assert.equal(user.snapshot().verifiedAt, AT)

    user.verify(new Date('2026-11-02T12:00:00.000Z'))

    assert.equal(user.snapshot().verifiedAt, AT)
  })

  test('when the account is staff or archived, it cannot be verified', ({
    assert,
  }) => {
    const moderator = stored({ role: USER_ROLE.MODERATOR })
    const archivedOwner = stored({ role: USER_ROLE.OWNER })
    archivedOwner.archive(ARCHIVED_AT)

    assert.deepEqual(moderator.verify(AT).value, {
      code: 'USER_NOT_VERIFIABLE',
    })
    assert.deepEqual(archivedOwner.verify(AT).value, {
      code: 'USER_NOT_VERIFIABLE',
    })
    assert.isNull(moderator.snapshot().verifiedAt)
  })

  test('when unverified, the seal goes away, and the sessions stay', ({
    assert,
  }) => {
    const user = stored({ role: USER_ROLE.OWNER })
    user.verify(AT)

    user.unverify()

    assert.isNull(user.snapshot().verifiedAt)
    assert.isFalse(user.credentials().revokeSessions)
  })
})

const ACTOR = '00000000-0000-4000-8000-0000000000a1'

/** Another administrator acting, two active administrators on the platform and no ad on the account. */
function context(
  extra: Partial<AccessChangeContext> = {},
): AccessChangeContext {
  return {
    actorId: ACTOR,
    activeAdministrators: 2,
    hasLiveListings: false,
    ...extra,
  }
}

test.group('domain > user > changeRole', () => {
  test('when another administrator changes the role, it changes and drops the sessions', ({
    assert,
  }) => {
    const user = stored({ role: USER_ROLE.OWNER })

    const result = user.changeRole(USER_ROLE.MODERATOR, context())

    assert.isTrue(result.isRight())
    assert.equal(user.snapshot().role, USER_ROLE.MODERATOR)
    assert.isTrue(user.credentials().revokeSessions)
  })

  test('when the role is the one the account already has, nothing changes and nothing is refused', ({
    assert,
  }) => {
    const self = stored({ role: USER_ROLE.ADMINISTRATOR })

    const result = self.changeRole(
      USER_ROLE.ADMINISTRATOR,
      context({ actorId: self.id, activeAdministrators: 1 }),
    )

    assert.isTrue(result.isRight())
    assert.isFalse(self.credentials().revokeSessions)
  })

  test('when the administrator changes his own role, it refuses with USER_OWN_ACCESS_CHANGE and keeps the role', ({
    assert,
  }) => {
    const self = stored({ role: USER_ROLE.ADMINISTRATOR })

    const result = self.changeRole(
      USER_ROLE.MODERATOR,
      context({ actorId: self.id }),
    )

    assert.deepEqual(result.value, { code: 'USER_OWN_ACCESS_CHANGE' })
    assert.equal(self.snapshot().role, USER_ROLE.ADMINISTRATOR)
  })

  test('when an owner with a live ad would become staff, it refuses with USER_OWNS_LISTINGS; without ads, or going to OWNER, it passes', ({
    assert,
  }) => {
    const owner = stored({ role: USER_ROLE.OWNER })
    const staff = stored({ role: USER_ROLE.MODERATOR })

    const refused = owner.changeRole(
      USER_ROLE.MODERATOR,
      context({ hasLiveListings: true }),
    )
    const free = owner.changeRole(USER_ROLE.MODERATOR, context())
    const back = staff.changeRole(
      USER_ROLE.OWNER,
      context({ hasLiveListings: true }),
    )

    assert.deepEqual(refused.value, { code: 'USER_OWNS_LISTINGS' })
    assert.isTrue(free.isRight())
    assert.isTrue(back.isRight())
  })

  test('when the account is the last active administrator, it refuses with USER_LAST_ADMINISTRATOR; with another one left, it passes', ({
    assert,
  }) => {
    const last = stored({ role: USER_ROLE.ADMINISTRATOR })
    const pair = stored({ role: USER_ROLE.ADMINISTRATOR })

    const refused = last.changeRole(
      USER_ROLE.OWNER,
      context({ activeAdministrators: 1 }),
    )
    const passes = pair.changeRole(USER_ROLE.OWNER, context())

    assert.deepEqual(refused.value, { code: 'USER_LAST_ADMINISTRATOR' })
    assert.equal(last.snapshot().role, USER_ROLE.ADMINISTRATOR)
    assert.isTrue(passes.isRight())
  })

  test('when a suspended administrator changes role, the count does not protect it: it was not one of the active', ({
    assert,
  }) => {
    const suspended = stored({
      role: USER_ROLE.ADMINISTRATOR,
      status: ACTIVE_STATUS.INACTIVE,
    })

    const result = suspended.changeRole(
      USER_ROLE.MODERATOR,
      context({ activeAdministrators: 1 }),
    )

    assert.isTrue(result.isRight())
  })
})

test.group('domain > user > changeStatus', () => {
  test('when suspended, the account goes INACTIVE and the sessions drop; reactivating brings it back', ({
    assert,
  }) => {
    const user = stored()

    const suspended = user.changeStatus(ACTIVE_STATUS.INACTIVE, context())
    const back = User.restore(user.snapshot())
    back.changeStatus(ACTIVE_STATUS.ACTIVE, context())

    assert.isTrue(suspended.isRight())
    assert.equal(user.snapshot().status, ACTIVE_STATUS.INACTIVE)
    assert.isTrue(user.credentials().revokeSessions)
    assert.equal(back.snapshot().status, ACTIVE_STATUS.ACTIVE)
  })

  test('when the status is the one the account already has, nothing changes', ({
    assert,
  }) => {
    const user = stored()

    const result = user.changeStatus(ACTIVE_STATUS.ACTIVE, context())

    assert.isTrue(result.isRight())
    assert.isFalse(user.credentials().revokeSessions)
  })

  test('when the administrator suspends himself, it refuses with USER_OWN_ACCESS_CHANGE', ({
    assert,
  }) => {
    const self = stored({ role: USER_ROLE.ADMINISTRATOR })

    const result = self.changeStatus(
      ACTIVE_STATUS.INACTIVE,
      context({ actorId: self.id }),
    )

    assert.deepEqual(result.value, { code: 'USER_OWN_ACCESS_CHANGE' })
    assert.equal(self.snapshot().status, ACTIVE_STATUS.ACTIVE)
  })

  test('when the last active administrator is suspended, it refuses with USER_LAST_ADMINISTRATOR', ({
    assert,
  }) => {
    const last = stored({ role: USER_ROLE.ADMINISTRATOR })

    const result = last.changeStatus(
      ACTIVE_STATUS.INACTIVE,
      context({ activeAdministrators: 1 }),
    )

    assert.deepEqual(result.value, { code: 'USER_LAST_ADMINISTRATOR' })
  })

  test('when an owner with live ads is suspended, it passes: only the sign-in goes, the ads stay', ({
    assert,
  }) => {
    const owner = stored({ role: USER_ROLE.OWNER })

    const result = owner.changeStatus(
      ACTIVE_STATUS.INACTIVE,
      context({ hasLiveListings: true }),
    )

    assert.isTrue(result.isRight())
  })
})
