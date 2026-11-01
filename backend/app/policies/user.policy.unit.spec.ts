import { test } from '@japa/runner'

import UserPolicy from './user.policy.ts'

import { actorDraft, userDraft } from '#tests/user-fixtures'

const ACTIONS = [
  ['changeAccess', 'SELF_ACCESS_FORBIDDEN'],
  ['archive', 'SELF_ARCHIVE_FORBIDDEN'],
  ['delete', 'SELF_DELETE_FORBIDDEN'],
] as const

test.group('policies > user (unit)', () => {
  for (const [action, code] of ACTIONS) {
    test(`when the target is another account, ${action} allows it`, ({
      assert,
    }) => {
      const policy = new UserPolicy()

      assert.isTrue(policy[action](actorDraft(), userDraft()))
    })

    test(`when the target is the actor's own account, ${action} answers 403 ${code}`, ({
      assert,
    }) => {
      const policy = new UserPolicy()
      const target = userDraft()

      assert.containSubset(
        policy[action](actorDraft({ id: target.id }), target),
        {
          authorized: false,
          status: 403,
          translation: { identifier: `errors.${code}` },
        },
      )
    })

    test(`when the target does not exist, ${action} answers 404 USER_NOT_FOUND`, ({
      assert,
    }) => {
      const policy = new UserPolicy()

      assert.containSubset(policy[action](actorDraft(), null), {
        authorized: false,
        status: 404,
        translation: { identifier: 'errors.USER_NOT_FOUND' },
      })
    })
  }
})
