import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import { ListingPhotoFactory } from '#database/factories/listing-photo.factory'
import { resetDatabase, storageRecord } from '#tests/database-fixtures'
import { body, errorBody, list, present } from '#tests/response-fixtures'
import { authenticateAsOwnerAccount } from '#tests/session-fixtures'
import {
  archivedListing,
  listingWithStatus,
  neighborhood,
} from '#tests/storefront-fixtures'

const MISSING = '00000000-0000-4000-8000-000000000000'

/**
 * The owner's ad by id. The contract asserted here is the policy's: an ad of another account
 * answers **exactly** like one that does not exist, so a probe cannot tell the two apart.
 */
test.group('owner > listings > show', (group) => {
  group.each.setup(() => resetDatabase())

  test("when the ad is the session's, answers 200 with the status, the signed url and the file key of each photo", async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const row = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })
    const file = await storageRecord({ ownerId: userId })
    await ListingPhotoFactory.merge({
      listingId: row.id,
      position: 0,
      environment: 'FACADE',
      storageId: file.id,
    }).create()
    await ListingPhotoFactory.merge({
      listingId: row.id,
      position: 1,
      environment: 'KITCHEN',
    }).create()

    const response = await client
      .get(`/owner/listings/${row.id}`)
      .cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).status, 'PENDING')
    const [first, second] = list(body(response).photos)
    assert.equal(present(first, 'first photo').storageId, file.id)
    assert.include(String(first?.url), file.path)
    assert.isNull(present(second, 'second photo').storageId)
    assert.isNull(second?.url)
    assert.notProperty(body(response), 'ownerId')
  })

  test("when the ad is another account's, answers the same 404 as for an ad that does not exist", async ({
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

    const probed = await client
      .get(`/owner/listings/${foreign.id}`)
      .cookies(session)
    const missing = await client
      .get(`/owner/listings/${MISSING}`)
      .cookies(session)

    probed.assertStatus(404)
    missing.assertStatus(404)
    assert.deepEqual(errorBody(probed), errorBody(missing))
    assert.equal(errorBody(probed).code, 'LISTING_NOT_FOUND')
  })

  test('when the ad has no account (seeded), answers 404 to every owner', async ({
    client,
  }) => {
    const centro = await neighborhood()
    const { session } = await authenticateAsOwnerAccount(client)
    const seeded = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      neighborhoodId: centro.id,
      ownerId: null,
    })

    const response = await client
      .get(`/owner/listings/${seeded.id}`)
      .cookies(session)

    response.assertStatus(404)
  })

  test('when the ad is in the trash, answers 404 even to its owner', async ({
    client,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const trashed = await archivedListing({
      neighborhoodId: centro.id,
      ownerId: userId,
    })

    const response = await client
      .get(`/owner/listings/${trashed.id}`)
      .cookies(session)

    response.assertStatus(404)
  })

  test('when the id is malformed, answers 422 instead of a Postgres 500', async ({
    client,
  }) => {
    const { session } = await authenticateAsOwnerAccount(client)

    const response = await client
      .get('/owner/listings/nao-e-uuid')
      .cookies(session)

    response.assertStatus(422)
  })

  test('when there is no session, answers 401', async ({ client }) => {
    const response = await client.get(`/owner/listings/${MISSING}`)

    response.assertStatus(401)
  })
})
