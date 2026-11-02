import { LISTING_STATUS, UPLOAD_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { ListingPhotoFactory } from '#database/factories/listing-photo.factory'
import { UserFactory } from '#database/factories/user.factory'
import { resetDatabase, storageRecord } from '#tests/database-fixtures'
import { body, errorBody, list, object } from '#tests/response-fixtures'
import {
  archivedListing,
  listing,
  listingWithStatus,
  neighborhood,
} from '#tests/storefront-fixtures'

/**
 * The public ad: `GET /storefront/listings/:slug`, with no cookie anywhere in this file. What
 * matters here is the closed shape (nothing from the panel) and that every ad that is not on the
 * air answers the same `404`, so the visitor cannot tell "exists" from "does not exist".
 */
test.group('storefront > listings > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('when published, answers 200 with the closed public shape', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood({ slug: 'centro', name: 'Centro' })
    const row = await listing({
      slug: 'kitnet-centro-porto',
      neighborhoodId: centro.id,
      ownerName: 'Seu Raimundo',
      ownerWhatsapp: '5597999990002',
      ownerVerifiedAt: DateTime.fromISO('2026-10-30T12:00:00Z'),
    })
    await ListingPhotoFactory.merge({
      listingId: row.id,
      position: 1,
      environment: 'BEDROOM',
    }).create()
    await ListingPhotoFactory.merge({
      listingId: row.id,
      position: 0,
      environment: 'FACADE',
    }).create()

    const response = await client.get(
      '/storefront/listings/kitnet-centro-porto',
    )

    response.assertStatus(200)
    // The whole key list, and not a sample: a column that leaks into the presenter breaks this.
    assert.sameMembers(Object.keys(body(response)), [
      'id',
      'slug',
      'type',
      'title',
      'description',
      'neighborhood',
      'address',
      'price',
      'costs',
      'periods',
      'minimumStayMonths',
      'availableFrom',
      'bedrooms',
      'bathrooms',
      'furnished',
      'rules',
      'photos',
      'owner',
      'lat',
      'lng',
      'createdAt',
      'updatedAt',
    ])
    assert.equal(body(response).id, row.id)
    assert.deepEqual(body(response).neighborhood, {
      slug: 'centro',
      name: 'Centro',
    })
    assert.deepEqual(body(response).price, { monthly: 900, daily: null })
    assert.equal(body(response).availableFrom, '2027-01-15')
    assert.deepEqual(body(response).periods, ['SEMESTER', 'MONTHLY'])
    assert.deepEqual(
      list(body(response).photos).map((photo) => photo.environment),
      ['FACADE', 'BEDROOM'],
    )
    assert.isNull(list(body(response).photos)[0]?.url)
    assert.deepEqual(object(body(response).owner), {
      name: 'Seu Raimundo',
      verified: true,
      whatsapp: '5597999990002',
      updatedAt: object(body(response).owner).updatedAt,
    })
    assert.match(
      String(object(body(response).owner).updatedAt),
      /^\d{4}-\d{2}-\d{2}$/,
    )
  })

  test('when a photo has a finished file, its url is the signed address; one whose upload never finished stays null', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const owner = await UserFactory.create()
    const row = await listing({ slug: 'com-fotos', neighborhoodId: centro.id })
    const done = await storageRecord({ ownerId: owner.id })
    const half = await storageRecord({
      ownerId: owner.id,
      status: UPLOAD_STATUS.PENDING,
    })
    await ListingPhotoFactory.merge({
      listingId: row.id,
      position: 0,
      environment: 'FACADE',
      storageId: done.id,
    }).create()
    await ListingPhotoFactory.merge({
      listingId: row.id,
      position: 1,
      environment: 'KITCHEN',
      storageId: half.id,
    }).create()

    const response = await client.get('/storefront/listings/com-fotos')

    response.assertStatus(200)
    const [first, second] = list(body(response).photos)
    assert.include(String(first?.url), done.path)
    assert.include(String(first?.url), 'X-Amz-Signature')
    assert.isNull(second?.url)
    // The public photo carries the address, never the key of the `storages` row.
    assert.sameMembers(Object.keys(first ?? {}), ['id', 'environment', 'url'])
  })

  test('when the ad is draft, pending, archived, trashed or unknown, answers the same 404', async ({
    client,
    assert,
  }) => {
    await listingWithStatus(LISTING_STATUS.DRAFT, { slug: 'rascunho' })
    await listingWithStatus(LISTING_STATUS.PENDING, { slug: 'em-analise' })
    await listingWithStatus(LISTING_STATUS.ARCHIVED, { slug: 'arquivado' })
    await archivedListing({ slug: 'na-lixeira' })

    for (const slug of [
      'rascunho',
      'em-analise',
      'arquivado',
      'na-lixeira',
      'nao-existe',
    ]) {
      const response = await client.get(`/storefront/listings/${slug}`)

      response.assertStatus(404)
      assert.equal(errorBody(response).code, 'LISTING_NOT_FOUND', slug)
    }
  })

  test('when the slug is longer than the column, answers 422 pointing at the field', async ({
    client,
    assert,
  }) => {
    const response = await client.get(`/storefront/listings/${'a'.repeat(101)}`)

    response.assertStatus(422)
    assert.property(errorBody(response).errors, 'slug')
  })
})
