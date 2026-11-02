import { LISTING_STATUS, LISTING_TYPE } from '@aporta/shared'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { resetDatabase } from '#tests/database-fixtures'
import { errorBody, page } from '#tests/response-fixtures'
import {
  archivedListing,
  listing,
  listingWithStatus,
  neighborhood,
} from '#tests/storefront-fixtures'

/**
 * The public catalog: `GET /storefront/listings`, with no cookie anywhere in this file.
 *
 * What is asserted here is what the query does before paginating: that only the published ones
 * come out, the default order, each filter, and that the query string is validated. The cut is
 * the same one `show` makes, and the module spec (`storefront.e2e.spec.ts`) proves the group
 * never asks for a session.
 */
test.group('storefront > listings > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('when listing, it brings only the published ones: draft, pending, archived and trashed are left out', async ({
    client,
    assert,
  }) => {
    const live = await listing({ slug: 'no-ar' })
    await listingWithStatus(LISTING_STATUS.DRAFT, { slug: 'rascunho' })
    await listingWithStatus(LISTING_STATUS.PENDING, { slug: 'em-analise' })
    await listingWithStatus(LISTING_STATUS.ARCHIVED, { slug: 'arquivado' })
    await archivedListing({ slug: 'na-lixeira' })

    const response = await client.get('/storefront/listings')

    response.assertStatus(200)
    assert.deepEqual(
      page(response).data.map((item) => item.id),
      [live.id],
    )
    assert.equal(page(response).meta.total, 1)
    assert.equal(page(response).meta.currentPage, 1)
    assert.equal(page(response).meta.perPage, 20)
  })

  test('when no order is given, the newest comes first', async ({
    client,
    assert,
  }) => {
    // `slug` order is the opposite of the date order, so only `createdAt desc` answers [recent, older].
    const older = await listing({ slug: 'a-antigo' })
    const recent = await listing({ slug: 'z-recente' })
    await older.merge({ createdAt: DateTime.now().minus({ days: 2 }) }).save()

    const response = await client.get('/storefront/listings')

    response.assertStatus(200)
    assert.deepEqual(
      page(response).data.map((item) => item.id),
      [recent.id, older.id],
    )
  })

  test('when ?type, ?neighborhood and ?period are sent, it narrows each one', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood({ slug: 'centro', name: 'Centro' })
    const colonia = await neighborhood({ slug: 'colonia', name: 'Colônia' })
    await listing({ slug: 'kitnet', neighborhoodId: centro.id })
    const room = await listing({
      slug: 'quarto',
      type: LISTING_TYPE.ROOM,
      neighborhoodId: colonia.id,
      periods: ['ACADEMIC_YEAR'],
    })

    const byType = await client.get('/storefront/listings').qs({ type: 'ROOM' })
    const byNeighborhood = await client
      .get('/storefront/listings')
      .qs({ neighborhood: 'colonia' })
    const byPeriod = await client
      .get('/storefront/listings')
      .qs({ period: 'ACADEMIC_YEAR' })

    for (const response of [byType, byNeighborhood, byPeriod]) {
      response.assertStatus(200)
      assert.deepEqual(
        page(response).data.map((item) => item.id),
        [room.id],
      )
    }
  })

  test('when ?minPrice and ?maxPrice are sent, a daily-only ad counts as thirty days', async ({
    client,
    assert,
  }) => {
    await listing({ slug: 'barato', priceMonthly: 600 })
    const medium = await listing({ slug: 'medio', priceMonthly: 900 })
    await listing({ slug: 'hotel', priceMonthly: null, priceDaily: 100 })

    const response = await client.get('/storefront/listings').qs({
      type: 'KITNET',
      minPrice: 600,
      maxPrice: 900,
      sort: 'price',
      direction: 'desc',
    })

    response.assertStatus(200)
    assert.deepEqual(
      page(response).data.map((item) => item.slug),
      [medium.slug, 'barato'],
    )
  })

  test('when ?search is sent, it does not escape the published cut', async ({
    client,
    assert,
  }) => {
    const live = await listing({ slug: 'no-ar', title: 'Casa com quintal' })
    // It matches the term by **description**, after the first column, and it is a draft: with a
    // loose `OR` it would come out for whoever typed it.
    await listingWithStatus(LISTING_STATUS.DRAFT, {
      slug: 'rascunho',
      title: 'Outra',
      description: 'Tem quintal grande.',
    })

    const response = await client
      .get('/storefront/listings')
      .qs({ search: 'quintal' })

    response.assertStatus(200)
    assert.deepEqual(
      page(response).data.map((item) => item.id),
      [live.id],
    )
  })

  test('when the map window is sent, only what falls inside it comes out, and the order and total follow', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood({ slug: 'centro', name: 'Centro' })
    const inside = await listing({
      slug: 'dentro',
      neighborhoodId: centro.id,
      lat: -4.38,
      lng: -70.03,
    })
    await listing({
      slug: 'fora',
      neighborhoodId: centro.id,
      lat: -3.1,
      lng: -60.2,
    })

    const response = await client.get('/storefront/listings').qs({
      minLng: -70.1,
      minLat: -4.4,
      maxLng: -70,
      maxLat: -4.3,
    })

    response.assertStatus(200)
    assert.deepEqual(
      page(response).data.map((item) => item.id),
      [inside.id],
    )
    assert.equal(page(response).meta.total, 1)
  })

  test('when the map window is incomplete or off the globe, answers 422 pointing at the field', async ({
    client,
    assert,
  }) => {
    const partial = await client
      .get('/storefront/listings')
      .qs({ minLat: -4.4, maxLat: -4.3 })
    const offGlobe = await client.get(
      '/storefront/listings?minLng=-70.1&minLat=-91&maxLng=-70&maxLat=-4.3',
    )

    partial.assertStatus(422)
    assert.property(errorBody(partial).errors, 'minLng')
    offGlobe.assertStatus(422)
    assert.property(errorBody(offGlobe).errors, 'minLat')
  })

  test('when ?sort is outside the closed tuple, answers 422 pointing at the field', async ({
    client,
    assert,
  }) => {
    // `ownerWhatsapp` is a column of `listings`, but not a sort column: the value would go straight
    // into `orderBy` and compose SQL. In the URL itself, because the typed client refuses the
    // invalid value this test exists to send.
    const response = await client.get('/storefront/listings?sort=ownerWhatsapp')

    response.assertStatus(422)
    assert.property(errorBody(response).errors, 'sort')
  })

  test('when ?type, ?period or the price are invalid, answers 422 pointing at each field', async ({
    client,
    assert,
  }) => {
    const response = await client.get(
      '/storefront/listings?type=CASTLE&period=FORTNIGHT&minPrice=-1&maxPrice=100001',
    )

    response.assertStatus(422)
    for (const field of ['type', 'period', 'minPrice', 'maxPrice'])
      assert.property(errorBody(response).errors, field)
  })

  test('when nothing is published, answers 200 with an empty page', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/storefront/listings')

    response.assertStatus(200)
    assert.deepEqual(page(response).data, [])
    assert.equal(page(response).meta.total, 0)
  })
})
