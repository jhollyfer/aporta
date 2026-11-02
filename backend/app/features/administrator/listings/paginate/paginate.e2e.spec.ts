import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { UserFactory } from '#database/factories/user.factory'
import { resetDatabase } from '#tests/database-fixtures'
import { errorBody, page, present } from '#tests/response-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsModerator,
  authenticateAsOwner,
} from '#tests/session-fixtures'
import { listingWithStatus, neighborhood } from '#tests/storefront-fixtures'

const URL: string = '/administrator/listings'

/**
 * The staff's list. The contract asserted here is the queue: the oldest pending ad first, the
 * archived ones reachable, the account behind every ad, and the door shut to the owner.
 */
test.group('administrator > listings > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the moderator asks for the queue, the oldest pending ad comes first, with the account behind it', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const session = await authenticateAsModerator(client)
    const owner = await UserFactory.merge({ name: 'Dona Maria' }).create()
    await listingWithStatus(LISTING_STATUS.PENDING, {
      slug: 'nova',
      neighborhoodId: centro.id,
      ownerId: owner.id,
      createdAt: DateTime.fromISO('2026-10-30T12:00:00Z'),
    })
    await listingWithStatus(LISTING_STATUS.PENDING, {
      slug: 'velha',
      neighborhoodId: centro.id,
      ownerId: owner.id,
      createdAt: DateTime.fromISO('2026-10-01T12:00:00Z'),
    })
    await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      slug: 'no-ar',
      neighborhoodId: centro.id,
      ownerId: owner.id,
    })

    const response = await client
      .get(URL)
      .qs({ status: 'PENDING' })
      .cookies(session)

    response.assertStatus(200)
    const { data, meta } = page(response)
    assert.deepEqual(
      data.map((each) => each.slug),
      ['velha', 'nova'],
    )
    assert.equal(meta.total, 2)
    assert.containsSubset(present(data[0], 'the first ad'), {
      status: 'PENDING',
      account: { id: owner.id, name: 'Dona Maria', email: owner.email },
    })
  })

  test('when the administrator asks for the archived ones, they are found even in the trash', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const session = await authenticateAsAdministrator(client)
    await listingWithStatus(LISTING_STATUS.ARCHIVED, {
      slug: 'saiu',
      neighborhoodId: centro.id,
      deletedAt: DateTime.now(),
    })
    await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      slug: 'no-ar',
      neighborhoodId: centro.id,
    })

    const archived = await client
      .get(URL)
      .qs({ status: 'ARCHIVED' })
      .cookies(session)
    const all = await client.get(URL).cookies(session)

    assert.deepEqual(
      page(archived).data.map((each) => each.slug),
      ['saiu'],
    )
    assert.isString(present(page(archived).data[0], 'the ad').archivedAt)
    assert.equal(page(all).meta.total, 2)
  })

  test('when the status is not one of the lifecycle, answers 422', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsModerator(client)

    const response = await client
      .get(URL)
      .qs({ status: 'SOLD' })
      .cookies(session)

    response.assertStatus(422)
    assert.property(errorBody(response).errors, 'status')
  })

  test('when the caller is an owner, answers 403 and when there is no session, 401', async ({
    client,
  }) => {
    const owner = await authenticateAsOwner(client)

    const forbidden = await client.get(URL).cookies(owner)
    const anonymous = await client.get(URL)

    forbidden.assertStatus(403)
    anonymous.assertStatus(401)
  })
})
