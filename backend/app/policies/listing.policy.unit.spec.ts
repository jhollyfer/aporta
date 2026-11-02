import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import ListingPolicy from './listing.policy.ts'

import { listingDraft } from '#tests/listing-fixtures'
import { actorDraft } from '#tests/user-fixtures'

const NOT_FOUND = {
  authorized: false,
  status: 404,
  translation: { identifier: 'errors.LISTING_NOT_FOUND' },
}

test.group('policies > listing (unit)', () => {
  for (const action of ['show', 'update', 'archive', 'attachPhotos'] as const) {
    test(`when the actor wrote the ad, ${action} allows it`, ({ assert }) => {
      const policy = new ListingPolicy()
      const actor = actorDraft()

      assert.isTrue(policy[action](actor, listingDraft({ ownerId: actor.id })))
    })

    test(`when the ad is another account's, ${action} answers the same 404 as for an ad that does not exist`, ({
      assert,
    }) => {
      const policy = new ListingPolicy()
      const actor = actorDraft()

      const foreign = policy[action](
        actor,
        listingDraft({ ownerId: randomUUID() }),
      )
      const missing = policy[action](actor, null)

      assert.containSubset(foreign, NOT_FOUND)
      // Same status, same code, same message: the response cannot tell the two apart.
      assert.deepEqual(foreign, missing)
    })

    test(`when the ad has no account (seeded before owners existed), ${action} allows no one`, ({
      assert,
    }) => {
      const policy = new ListingPolicy()

      assert.containSubset(
        policy[action](actorDraft(), listingDraft({ ownerId: null })),
        NOT_FOUND,
      )
    })
  }
})
