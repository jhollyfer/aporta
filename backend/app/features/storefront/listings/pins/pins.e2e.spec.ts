import { LISTING_PINS_LIMIT, LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import { resetDatabase } from '#tests/database-fixtures'
import { errorBody, page } from '#tests/response-fixtures'
import {
  archivedListing,
  listing,
  listingWithStatus,
  neighborhood,
} from '#tests/storefront-fixtures'

/**
 * The map points: `GET /storefront/listings/pins`, with no cookie anywhere in this file. The cut
 * is the catalog's (published and outside the trash), the shape is the light one, and the window
 * and filters narrow it the same way they narrow the catalog.
 */
test.group('storefront > listings > pins', (group) => {
  group.each.setup(() => resetDatabase())

  test('when asking for pins, it brings only the published ones, in the light shape', async ({
    client,
    assert,
  }) => {
    const live = await listing({ slug: 'no-ar', priceMonthly: 900 })
    await listingWithStatus(LISTING_STATUS.DRAFT, { slug: 'rascunho' })
    await listingWithStatus(LISTING_STATUS.PENDING, { slug: 'em-analise' })
    await archivedListing({ slug: 'na-lixeira' })

    const response = await client.get('/storefront/listings/pins')

    response.assertStatus(200)
    assert.deepEqual(
      page(response).data.map((item) => item.id),
      [live.id],
    )
    assert.deepEqual(page(response).meta, {
      total: 1,
      limit: LISTING_PINS_LIMIT,
    })
    const [pin] = page(response).data
    assert.sameMembers(Object.keys(pin ?? {}), [
      'id',
      'slug',
      'type',
      'lat',
      'lng',
      'price',
    ])
    // The WhatsApp is the ad's contact, and a pin has no reason to carry it.
    assert.notInclude(JSON.stringify(response.body()), live.ownerWhatsapp)
  })

  test('when the window and a filter are sent, it keeps what fits both', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood({ slug: 'centro', name: 'Centro' })
    const room = await listing({
      slug: 'quarto',
      type: 'ROOM',
      neighborhoodId: centro.id,
      lat: -4.38,
      lng: -70.03,
    })
    await listing({
      slug: 'kitnet-dentro',
      neighborhoodId: centro.id,
      lat: -4.38,
      lng: -70.03,
    })
    await listing({
      slug: 'quarto-fora',
      type: 'ROOM',
      neighborhoodId: centro.id,
      lat: -3.1,
      lng: -60.2,
    })

    const response = await client.get('/storefront/listings/pins').qs({
      minLng: -70.1,
      minLat: -4.4,
      maxLng: -70,
      maxLat: -4.3,
      type: 'ROOM',
    })

    response.assertStatus(200)
    assert.deepEqual(
      page(response).data.map((item) => item.id),
      [room.id],
    )
    assert.equal(page(response).meta.total, 1)
  })

  test('when the window is incomplete or a filter is invalid, answers 422 pointing at each field', async ({
    client,
    assert,
  }) => {
    const partial = await client
      .get('/storefront/listings/pins')
      .qs({ maxLng: -70 })
    const invalid = await client.get(
      '/storefront/listings/pins?type=CASTLE&maxPrice=100001',
    )

    partial.assertStatus(422)
    assert.property(errorBody(partial).errors, 'minLng')
    invalid.assertStatus(422)
    for (const field of ['type', 'maxPrice'])
      assert.property(errorBody(invalid).errors, field)
  })

  test('when nothing is published, answers 200 with an empty list and total zero', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/storefront/listings/pins')

    response.assertStatus(200)
    assert.deepEqual(page(response).data, [])
    assert.equal(page(response).meta.total, 0)
  })

  test('when the path is "pins", it is the map and not an ad with that slug', async ({
    client,
    assert,
  }) => {
    await listing({ slug: 'pins' })

    const response = await client.get('/storefront/listings/pins')

    response.assertStatus(200)
    assert.property(page(response).meta, 'limit')
  })
})
