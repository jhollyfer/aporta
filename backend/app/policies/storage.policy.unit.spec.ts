import { randomUUID } from 'node:crypto'

import { USER_ROLE } from '@aporta/shared'
import { test } from '@japa/runner'

import StoragePolicy from './storage.policy.ts'

import { storageDraft } from '#tests/repository-fixtures'
import { actorDraft } from '#tests/user-fixtures'

test.group('policies > storage (unit)', () => {
  for (const role of [USER_ROLE.ADMINISTRATOR, USER_ROLE.MODERATOR]) {
    test(`when the actor is ${role}, download allows any file`, ({
      assert,
    }) => {
      const policy = new StoragePolicy()

      assert.isTrue(policy.download(actorDraft({ role }), storageDraft()))
    })
  }

  test('when the actor is an OWNER, download allows their own avatar and the files they sent, and nothing else', ({
    assert,
  }) => {
    const policy = new StoragePolicy()
    const avatar = storageDraft({ ownerId: randomUUID() })
    const owner = actorDraft({ role: USER_ROLE.OWNER, avatarId: avatar.id })
    const sent = storageDraft({ ownerId: owner.id })

    assert.isTrue(policy.download(owner, avatar))
    assert.isTrue(policy.download(owner, sent))
    assert.containSubset(policy.download(owner, storageDraft()), {
      authorized: false,
      status: 404,
      translation: { identifier: 'errors.STORAGE_NOT_FOUND' },
    })
  })

  for (const action of ['show', 'complete', 'parts', 'delete'] as const) {
    test(`when the actor is an OWNER, ${action} allows only the files they sent, and answers 404 for someone else's`, ({
      assert,
    }) => {
      const policy = new StoragePolicy()
      const owner = actorDraft({ role: USER_ROLE.OWNER })

      assert.isTrue(policy[action](owner, storageDraft({ ownerId: owner.id })))
      assert.containSubset(policy[action](owner, storageDraft()), {
        authorized: false,
        status: 404,
        translation: { identifier: 'errors.STORAGE_NOT_FOUND' },
      })
    })

    test(`when the actor is staff, ${action} allows any file, and a missing one answers 404`, ({
      assert,
    }) => {
      const policy = new StoragePolicy()
      const moderator = actorDraft({ role: USER_ROLE.MODERATOR })

      assert.isTrue(policy[action](moderator, storageDraft()))
      assert.containSubset(policy[action](moderator, null), {
        authorized: false,
        status: 404,
      })
    })
  }

  test('when the file does not exist, download answers 404 STORAGE_NOT_FOUND', ({
    assert,
  }) => {
    const policy = new StoragePolicy()

    assert.containSubset(policy.download(actorDraft(), null), {
      authorized: false,
      status: 404,
      translation: { identifier: 'errors.STORAGE_NOT_FOUND' },
    })
  })
})
