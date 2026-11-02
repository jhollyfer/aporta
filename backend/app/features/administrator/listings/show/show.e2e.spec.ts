import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { UserFactory } from '#database/factories/user.factory'
import { resetDatabase } from '#tests/database-fixtures'
import { body, errorBody } from '#tests/response-fixtures'
import {
  authenticateAsModerator,
  authenticateAsOwner,
} from '#tests/session-fixtures'
import { listingWithStatus, neighborhood } from '#tests/storefront-fixtures'

const MISSING = '00000000-0000-4000-8000-000000000000'

test.group('administrator > listings > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the ad is archived, the staff still reads it with the account behind it', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const session = await authenticateAsModerator(client)
    const owner = await UserFactory.create()
    const row = await listingWithStatus(LISTING_STATUS.ARCHIVED, {
      neighborhoodId: centro.id,
      ownerId: owner.id,
      deletedAt: DateTime.now(),
    })

    const response = await client
      .get(`/administrator/listings/${row.id}`)
      .cookies(session)

    response.assertStatus(200)
    assert.containsSubset(body(response), {
      id: row.id,
      status: 'ARCHIVED',
      account: { id: owner.id, verified: false },
    })
    assert.isString(body(response).archivedAt)
    assert.notProperty(body(response), 'ownerId')
  })

  test('when the id is not an ad, answers 404 LISTING_NOT_FOUND; when it is not a uuid, 422', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsModerator(client)

    const missing = await client
      .get(`/administrator/listings/${MISSING}`)
      .cookies(session)
    const malformed = await client
      .get('/administrator/listings/nao-e-uuid')
      .cookies(session)

    missing.assertStatus(404)
    assert.equal(errorBody(missing).code, 'LISTING_NOT_FOUND')
    malformed.assertStatus(422)
  })

  test('when the caller is an owner, answers 403 and the ad is not revealed', async ({
    client,
  }) => {
    const centro = await neighborhood()
    const owner = await authenticateAsOwner(client)
    const row = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
    })

    const response = await client
      .get(`/administrator/listings/${row.id}`)
      .cookies(owner)

    response.assertStatus(403)
  })
})
