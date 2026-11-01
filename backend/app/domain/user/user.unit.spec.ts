import { ACTIVE_STATUS, USER_ROLE } from '@aporta/shared'
import { test } from '@japa/runner'

import User from '#domain/user/user.entity'
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
