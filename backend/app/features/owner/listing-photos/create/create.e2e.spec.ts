import {
  LISTING_PHOTO_MAX_SIZE,
  LISTING_PHOTOS_MAX,
  LISTING_STATUS,
  UPLOAD_STATUS,
} from '@aporta/shared'
import { test } from '@japa/runner'

import { ListingPhotoFactory } from '#database/factories/listing-photo.factory'
import ListingPhotoModel from '#models/listing-photo'
import { resetDatabase, storageRecord } from '#tests/database-fixtures'
import { body, errorBody, list, present } from '#tests/response-fixtures'
import { authenticateAsOwnerAccount } from '#tests/session-fixtures'
import { listingWithStatus, neighborhood } from '#tests/storefront-fixtures'

/**
 * A `string` and not the literal: the typed overload refuses the bodies these cases send on
 * purpose (a file key that is not a uuid, an environment outside the list).
 */
function url(id: string): string {
  return `/owner/listings/${id}/photos`
}

/**
 * Putting uploaded pictures on an ad. The rows in `storages` are written by the factory: the
 * binary is not what this action reads, only the key and the owner of the row. The contract
 * asserted here is the two ownerships: the ad is the session's (policy, 404), and so are the
 * files (repository, 422 identical for "not yours" and "does not exist").
 */
test.group('owner > listing-photos > create', (group) => {
  group.each.setup(() => resetDatabase())

  test("when the files are the owner's finished images, answers 201 with the whole ad, photos in order and signed", async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const ad = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })
    const facade = await storageRecord({ ownerId: userId })
    const kitchen = await storageRecord({ ownerId: userId })

    const response = await client
      .post(url(ad.id))
      .cookies(session)
      .json({
        photos: [
          { storageId: facade.id, environment: 'FACADE' },
          { storageId: kitchen.id, environment: 'KITCHEN' },
        ],
      })

    response.assertStatus(201)
    const photos = list(body(response).photos)
    assert.deepEqual(
      photos.map((photo) => [photo.environment, photo.storageId]),
      [
        ['FACADE', facade.id],
        ['KITCHEN', kitchen.id],
      ],
    )
    assert.include(String(present(photos[0], 'first photo').url), facade.path)
    assert.equal(body(response).status, 'PENDING')
    const rows = await ListingPhotoModel.query()
      .where('listingId', ad.id)
      .orderBy('position')
    assert.deepEqual(
      rows.map((row) => row.storageId),
      [facade.id, kitchen.id],
    )
  })

  test('when photos already exist, the new ones go to the end', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const ad = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })
    const first = await storageRecord({ ownerId: userId })
    const second = await storageRecord({ ownerId: userId })
    await ListingPhotoFactory.merge({
      listingId: ad.id,
      position: 0,
      storageId: first.id,
    }).create()

    const response = await client
      .post(url(ad.id))
      .cookies(session)
      .json({ photos: [{ storageId: second.id, environment: 'BEDROOM' }] })

    response.assertStatus(201)
    assert.deepEqual(
      list(body(response).photos).map((photo) => photo.storageId),
      [first.id, second.id],
    )
  })

  test("when a file is another account's, still PENDING or unknown, answers the same 422 and attaches nothing", async ({
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
    const mine = await storageRecord({ ownerId: userId })
    const bad = [
      (await storageRecord({ ownerId: other.userId })).id,
      (await storageRecord({ ownerId: userId, status: UPLOAD_STATUS.PENDING }))
        .id,
      '00000000-0000-4000-8000-000000000000',
    ]

    const answers = []
    for (const storageId of bad) {
      const response = await client
        .post(url(ad.id))
        .cookies(session)
        .json({
          photos: [
            { storageId: mine.id, environment: 'FACADE' },
            { storageId, environment: 'KITCHEN' },
          ],
        })

      response.assertStatus(422)
      answers.push(errorBody(response))
    }

    // The three refusals are one: a probe learns nothing about which uuids are files.
    assert.lengthOf(new Set(answers.map((each) => JSON.stringify(each))), 1)
    assert.equal(answers[0]?.code, 'STORAGE_NOT_FOUND')
    assert.property(answers[0]?.errors ?? {}, 'photos')
    assert.lengthOf(
      await ListingPhotoModel.query().where('listingId', ad.id),
      0,
    )
  })

  test("when the account's own file is not a JPEG, PNG or WebP, or is above 10 MB, answers its own 422 and attaches nothing", async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const ad = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })
    const refused = [
      ['LISTING_PHOTO_TYPE_INVALID', { mimetype: 'application/pdf' }],
      ['LISTING_PHOTO_TYPE_INVALID', { mimetype: 'image/gif' }],
      ['LISTING_PHOTO_TOO_LARGE', { size: LISTING_PHOTO_MAX_SIZE + 1 }],
    ] as const

    for (const [code, attributes] of refused) {
      const file = await storageRecord({ ownerId: userId, ...attributes })

      const response = await client
        .post(url(ad.id))
        .cookies(session)
        .json({ photos: [{ storageId: file.id, environment: 'FACADE' }] })

      response.assertStatus(422)
      assert.equal(errorBody(response).code, code)
      assert.property(errorBody(response).errors ?? {}, 'photos')
    }

    const exact = await storageRecord({
      ownerId: userId,
      size: LISTING_PHOTO_MAX_SIZE,
    })
    const accepted = await client
      .post(url(ad.id))
      .cookies(session)
      .json({ photos: [{ storageId: exact.id, environment: 'FACADE' }] })
    accepted.assertStatus(201)
    assert.lengthOf(
      await ListingPhotoModel.query().where('listingId', ad.id),
      1,
    )
  })

  test("when the ad is another account's, answers the same 404 as a missing ad and attaches nothing", async ({
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
    const mine = await storageRecord({ ownerId: userId })
    const body_ = { photos: [{ storageId: mine.id, environment: 'FACADE' }] }

    const probed = await client
      .post(url(foreign.id))
      .cookies(session)
      .json(body_)
    const missing = await client
      .post(url('00000000-0000-4000-8000-000000000000'))
      .cookies(session)
      .json(body_)

    probed.assertStatus(404)
    assert.deepEqual(errorBody(probed), errorBody(missing))
    assert.equal(
      (await ListingPhotoModel.query().where('listingId', foreign.id)).length,
      0,
    )
  })

  test('when the ad would pass the ceiling, answers 422 LISTING_PHOTOS_LIMIT', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const ad = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })
    for (let position = 0; position < LISTING_PHOTOS_MAX; position += 1) {
      await ListingPhotoFactory.merge({ listingId: ad.id, position }).create()
    }
    const extra = await storageRecord({ ownerId: userId })

    const response = await client
      .post(url(ad.id))
      .cookies(session)
      .json({ photos: [{ storageId: extra.id, environment: 'LIVING' }] })

    response.assertStatus(422)
    assert.equal(errorBody(response).code, 'LISTING_PHOTOS_LIMIT')
  })

  test('when the same file is sent twice, answers 409 LISTING_PHOTO_DUPLICATED', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const ad = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })
    const file = await storageRecord({ ownerId: userId })

    const response = await client
      .post(url(ad.id))
      .cookies(session)
      .json({
        photos: [
          { storageId: file.id, environment: 'FACADE' },
          { storageId: file.id, environment: 'KITCHEN' },
        ],
      })

    response.assertStatus(409)
    assert.equal(errorBody(response).code, 'LISTING_PHOTO_DUPLICATED')
  })

  test('when the body is malformed, answers 422 pointing at each field', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const ad = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })

    const empty = await client
      .post(url(ad.id))
      .cookies(session)
      .json({ photos: [] })
    const wrong = await client
      .post(url(ad.id))
      .cookies(session)
      .json({ photos: [{ storageId: 'nao-e-uuid', environment: 'GARAGE' }] })

    empty.assertStatus(422)
    wrong.assertStatus(422)
    // The key is the whole path, dots included, so it is read as a key and not as nested.
    assert.sameMembers(Object.keys(errorBody(wrong).errors ?? {}), [
      'photos.0.storageId',
      'photos.0.environment',
    ])
  })

  test('when the ad is published, the storefront shows the signed url and never the file key', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const ad = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })
    const file = await storageRecord({ ownerId: userId })
    await client
      .post(url(ad.id))
      .cookies(session)
      .json({ photos: [{ storageId: file.id, environment: 'FACADE' }] })

    const response = await client.get(`/storefront/listings/${ad.slug}`)

    response.assertStatus(200)
    const [photo] = list(body(response).photos)
    assert.include(String(present(photo, 'photo').url), file.path)
    assert.notProperty(present(photo, 'photo'), 'storageId')
  })

  test('when there is no session, answers 401', async ({ client }) => {
    const response = await client
      .post(url('00000000-0000-4000-8000-000000000000'))
      .json({})

    response.assertStatus(401)
  })
})
