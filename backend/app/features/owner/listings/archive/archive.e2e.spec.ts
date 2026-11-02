import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import ListingModel from '#models/listing'
import { resetDatabase } from '#tests/database-fixtures'
import { errorBody, page } from '#tests/response-fixtures'
import { authenticateAsOwnerAccount } from '#tests/session-fixtures'
import { listingWithStatus, neighborhood } from '#tests/storefront-fixtures'

/**
 * Taking an ad off the air. The contract asserted here: it goes to `ARCHIVED` and the trash in
 * one step, every read stops finding it (the owner's and the storefront's), and another
 * account's ad is neither archived nor revealed.
 */
test.group('owner > listings > archive', (group) => {
  group.each.setup(() => resetDatabase())

  test("when the ad is the session's, answers 204 and the ad leaves every read", async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const row = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })

    const response = await client
      .delete(`/owner/listings/${row.id}`)
      .cookies(session)

    response.assertStatus(204)
    const stored = await ListingModel.findOrFail(row.id)
    assert.equal(stored.status, 'ARCHIVED')
    assert.isNotNull(stored.deletedAt)
    const own = await client.get(`/owner/listings/${row.id}`).cookies(session)
    const mine = await client.get('/owner/listings').cookies(session)
    const storefront = await client.get(`/storefront/listings/${row.slug}`)
    own.assertStatus(404)
    storefront.assertStatus(404)
    assert.deepEqual(page(mine).data, [])
  })

  test('when the ad is archived twice, the second answers 404 like any ad that is not there', async ({
    client,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const row = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })
    await client.delete(`/owner/listings/${row.id}`).cookies(session)

    const response = await client
      .delete(`/owner/listings/${row.id}`)
      .cookies(session)

    response.assertStatus(404)
  })

  test("when the ad is another account's, answers 404 and leaves it on the air", async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const other = await authenticateAsOwnerAccount(client)
    const { session } = await authenticateAsOwnerAccount(client)
    const foreign = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      neighborhoodId: centro.id,
      ownerId: other.userId,
    })

    const response = await client
      .delete(`/owner/listings/${foreign.id}`)
      .cookies(session)

    response.assertStatus(404)
    assert.equal(errorBody(response).code, 'LISTING_NOT_FOUND')
    const stored = await ListingModel.findOrFail(foreign.id)
    assert.equal(stored.status, 'PUBLISHED')
    assert.isNull(stored.deletedAt)
  })

  test('when there is no session, answers 401', async ({ client }) => {
    const response = await client.delete(
      '/owner/listings/00000000-0000-4000-8000-000000000000',
    )

    response.assertStatus(401)
  })
})
