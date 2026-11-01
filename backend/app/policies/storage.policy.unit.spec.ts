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

  test('when the actor is an OWNER, download allows only their own avatar', ({
    assert,
  }) => {
    const policy = new StoragePolicy()
    const file = storageDraft()
    const owner = actorDraft({ role: USER_ROLE.OWNER, avatarId: file.id })

    assert.isTrue(policy.download(owner, file))
    assert.containSubset(policy.download(owner, storageDraft()), {
      authorized: false,
      status: 404,
      translation: { identifier: 'errors.STORAGE_NOT_FOUND' },
    })
  })

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
