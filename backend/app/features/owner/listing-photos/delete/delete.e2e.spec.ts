import app from '@adonisjs/core/services/app'
import { LISTING_STATUS, STORAGE_MIMETYPE, TRASHED_MODE } from '@aporta/shared'
import { test } from '@japa/runner'

import { ListingPhotoFactory } from '#database/factories/listing-photo.factory'
import ListingPhotoModel from '#models/listing-photo'
import StorageRepository from '#repositories/storage/storage.repository'
import StorageContract from '#services/storage/storage.contract'
import { resetDatabase, storageRecord } from '#tests/database-fixtures'
import { errorBody } from '#tests/response-fixtures'
import { authenticateAsOwnerAccount } from '#tests/session-fixtures'
import {
  archivedListing,
  listingWithStatus,
  neighborhood,
} from '#tests/storefront-fixtures'

/** A `string` and not the literal: the typed overload refuses the malformed ids sent on purpose. */
function url(id: string, photoId: string): string {
  return `/owner/listings/${id}/photos/${photoId}`
}

/**
 * Removing one picture of the owner's ad. The contract asserted here: the ad is the session's
 * (policy, 404), the others move up, and the binary leaves the bucket only when no other photo
 * (the demo seed shares them between ads) points at it.
 */
test.group('owner > listing-photos > delete', (group) => {
  group.each.setup(() => resetDatabase())

  /** A finished upload with a real object under its `path`. */
  async function stored(ownerId: string, bucket: StorageContract) {
    const row = await storageRecord({ ownerId })
    const put = await bucket.put(
      row.path,
      new Uint8Array([0xff, 0xd8, 0xff]),
      STORAGE_MIMETYPE.JPEG,
    )
    if (put.isLeft()) throw new Error('the bucket refused the test object')

    return row
  }

  async function exists(bucket: StorageContract, path: string) {
    const meta = await bucket.metadata(path)

    return meta.isRight() && meta.value !== null
  }

  test('when the file is an orphan, answers 204, the others move up and the binary leaves the bucket', async ({
    client,
    assert,
  }) => {
    const bucket = await app.container.make(StorageContract)
    const files = await app.container.make(StorageRepository)
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const ad = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })
    const first = await stored(userId, bucket)
    const second = await stored(userId, bucket)
    const third = await stored(userId, bucket)
    const photos = []
    for (const [position, file] of [first, second, third].entries()) {
      photos.push(
        await ListingPhotoFactory.merge({
          listingId: ad.id,
          position,
          storageId: file.id,
        }).create(),
      )
    }

    const response = await client
      .delete(url(ad.id, photos[0]?.id ?? ''))
      .cookies(session)

    response.assertStatus(204)
    const rows = await ListingPhotoModel.query()
      .where('listingId', ad.id)
      .orderBy('position')
    assert.deepEqual(
      rows.map((row) => [row.storageId, row.position]),
      [
        [second.id, 0],
        [third.id, 1],
      ],
    )
    assert.isFalse(await exists(bucket, first.path))
    assert.isNull(await files.findById(first.id, TRASHED_MODE.WITH))
    assert.isTrue(await exists(bucket, second.path))
  })

  test('when another ad shares the file, answers 204 but the binary stays in the bucket', async ({
    client,
    assert,
  }) => {
    const bucket = await app.container.make(StorageContract)
    const files = await app.container.make(StorageRepository)
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const other = await authenticateAsOwnerAccount(client)
    const mine = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })
    const theirs = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      neighborhoodId: centro.id,
      ownerId: other.userId,
    })
    const shared = await stored(userId, bucket)
    const photo = await ListingPhotoFactory.merge({
      listingId: mine.id,
      position: 0,
      storageId: shared.id,
    }).create()
    await ListingPhotoFactory.merge({
      listingId: theirs.id,
      position: 0,
      storageId: shared.id,
    }).create()

    const response = await client
      .delete(url(mine.id, photo.id))
      .cookies(session)

    response.assertStatus(204)
    assert.lengthOf(
      await ListingPhotoModel.query().where('listingId', mine.id),
      0,
    )
    assert.lengthOf(
      await ListingPhotoModel.query().where('listingId', theirs.id),
      1,
    )
    assert.isTrue(await exists(bucket, shared.path))
    assert.isNotNull(await files.findById(shared.id, TRASHED_MODE.WITH))
  })

  test("when the ad is another account's, answers the same 404 as a missing ad and removes nothing", async ({
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
    const photo = await ListingPhotoFactory.merge({
      listingId: foreign.id,
      position: 0,
    }).create()

    const probed = await client
      .delete(url(foreign.id, photo.id))
      .cookies(session)
    const missing = await client
      .delete(url('00000000-0000-4000-8000-000000000000', photo.id))
      .cookies(session)

    probed.assertStatus(404)
    assert.deepEqual(errorBody(probed), errorBody(missing))
    assert.equal(errorBody(probed).code, 'LISTING_NOT_FOUND')
    assert.lengthOf(
      await ListingPhotoModel.query().where('listingId', foreign.id),
      1,
    )
  })

  test('when the photo belongs to another ad, answers 404 LISTING_PHOTO_NOT_FOUND and removes nothing', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const other = await authenticateAsOwnerAccount(client)
    const mine = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })
    const theirs = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
      ownerId: other.userId,
    })
    const foreignPhoto = await ListingPhotoFactory.merge({
      listingId: theirs.id,
      position: 0,
    }).create()

    const response = await client
      .delete(url(mine.id, foreignPhoto.id))
      .cookies(session)

    response.assertStatus(404)
    assert.equal(errorBody(response).code, 'LISTING_PHOTO_NOT_FOUND')
    assert.lengthOf(
      await ListingPhotoModel.query().where('listingId', theirs.id),
      1,
    )
  })

  test('when the ad is archived, answers the 404 of a missing ad', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const ad = await archivedListing({
      neighborhoodId: centro.id,
      ownerId: userId,
    })
    const photo = await ListingPhotoFactory.merge({
      listingId: ad.id,
      position: 0,
    }).create()

    const response = await client.delete(url(ad.id, photo.id)).cookies(session)

    response.assertStatus(404)
    assert.equal(errorBody(response).code, 'LISTING_NOT_FOUND')
    assert.lengthOf(
      await ListingPhotoModel.query().where('listingId', ad.id),
      1,
    )
  })

  test('when the identifiers are not uuids, answers 422 and when there is no session, 401', async ({
    client,
  }) => {
    const { session } = await authenticateAsOwnerAccount(client)

    const malformed = await client
      .delete(url('nao-e-uuid', 'tambem-nao'))
      .cookies(session)
    const anonymous = await client.delete(
      url(
        '00000000-0000-4000-8000-000000000000',
        '00000000-0000-4000-8000-000000000001',
      ),
    )

    malformed.assertStatus(422)
    anonymous.assertStatus(401)
  })
})
