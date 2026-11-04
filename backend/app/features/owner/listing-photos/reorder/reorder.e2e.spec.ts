import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import { ListingPhotoFactory } from '#database/factories/listing-photo.factory'
import ListingPhotoModel from '#models/listing-photo'
import { resetDatabase } from '#tests/database-fixtures'
import { body, errorBody, list } from '#tests/response-fixtures'
import { authenticateAsOwnerAccount } from '#tests/session-fixtures'
import {
  archivedListing,
  listingWithStatus,
  neighborhood,
} from '#tests/storefront-fixtures'

/** A `string` and not the literal: the typed overload refuses the bodies sent on purpose. */
function url(id: string): string {
  return `/owner/listings/${id}/photos/order`
}

async function gallery(listingId: string, count: number) {
  const photos = []
  for (let position = 0; position < count; position += 1) {
    photos.push(
      await ListingPhotoFactory.merge({ listingId, position }).create(),
    )
  }

  return photos
}

/**
 * Reordering the gallery of the owner's ad. The contract asserted here: the ad is the session's
 * (policy, 404), the list must be exactly the photos the ad has (422 with its own code) and the
 * positions in the table follow the order sent.
 */
test.group('owner > listing-photos > reorder', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the list is exactly the gallery, answers 200 with the whole ad in the new order and saves the positions', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const ad = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })
    const [a, b, c] = await gallery(ad.id, 3)
    const wanted = [c?.id ?? '', a?.id ?? '', b?.id ?? '']

    const response = await client
      .put(url(ad.id))
      .cookies(session)
      .json({ photoIds: wanted })

    response.assertStatus(200)
    assert.deepEqual(
      list(body(response).photos).map((photo) => photo.id),
      wanted,
    )
    assert.equal(body(response).status, LISTING_STATUS.PUBLISHED)
    const rows = await ListingPhotoModel.query()
      .where('listingId', ad.id)
      .orderBy('position')
    assert.deepEqual(
      rows.map((row) => row.id),
      wanted,
    )
  })

  test('when the list misses, repeats or adds a photo, answers 422 LISTING_PHOTOS_ORDER_INVALID and keeps the order', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const other = await authenticateAsOwnerAccount(client)
    const ad = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })
    const theirs = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
      ownerId: other.userId,
    })
    const [a, b] = await gallery(ad.id, 2)
    const [foreign] = await gallery(theirs.id, 1)
    const ida = a?.id ?? ''
    const idb = b?.id ?? ''

    for (const photoIds of [
      [ida],
      [ida, ida, idb],
      [ida, idb, foreign?.id ?? ''],
      [ida, foreign?.id ?? ''],
    ]) {
      const response = await client
        .put(url(ad.id))
        .cookies(session)
        .json({ photoIds })

      response.assertStatus(422)
      assert.equal(errorBody(response).code, 'LISTING_PHOTOS_ORDER_INVALID')
      assert.property(errorBody(response).errors ?? {}, 'photoIds')
    }

    const rows = await ListingPhotoModel.query()
      .where('listingId', ad.id)
      .orderBy('position')
    assert.deepEqual(
      rows.map((row) => row.id),
      [ida, idb],
    )
  })

  test('when the body is not a list of uuids or is empty, answers 422', async ({
    client,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const ad = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })

    for (const payload of [{ photoIds: [] }, { photoIds: ['x'] }, {}]) {
      const response = await client
        .put(url(ad.id))
        .cookies(session)
        .json(payload)

      response.assertStatus(422)
    }
  })

  test("when the ad is another account's, or archived, answers the same 404 as a missing ad", async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const other = await authenticateAsOwnerAccount(client)
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const foreign = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      neighborhoodId: centro.id,
      ownerId: other.userId,
    })
    const archived = await archivedListing({
      neighborhoodId: centro.id,
      ownerId: userId,
    })
    const [photo] = await gallery(foreign.id, 1)
    const payload = { photoIds: [photo?.id ?? ''] }

    const probed = await client
      .put(url(foreign.id))
      .cookies(session)
      .json(payload)
    const gone = await client
      .put(url(archived.id))
      .cookies(session)
      .json(payload)
    const missing = await client
      .put(url('00000000-0000-4000-8000-000000000000'))
      .cookies(session)
      .json(payload)

    probed.assertStatus(404)
    gone.assertStatus(404)
    assert.deepEqual(errorBody(probed), errorBody(missing))
    assert.deepEqual(errorBody(gone), errorBody(missing))
  })

  test('when there is no session, answers 401', async ({ client }) => {
    const response = await client
      .put(url('00000000-0000-4000-8000-000000000000'))
      .json({ photoIds: ['00000000-0000-4000-8000-000000000001'] })

    response.assertStatus(401)
  })
})
