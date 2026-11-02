import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import ListingModel from '#models/listing'
import { resetDatabase } from '#tests/database-fixtures'
import { body, errorBody } from '#tests/response-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsModerator,
  authenticateAsOwner,
} from '#tests/session-fixtures'
import { listingWithStatus, neighborhood } from '#tests/storefront-fixtures'

const MISSING = '00000000-0000-4000-8000-000000000000'
const url = (id: string): string => `/administrator/listings/${id}`

/**
 * The staff taking any ad off the air. The contract asserted here: ARCHIVED and the trash in one
 * step, every public and owner read stops finding it, the staff still does, and there is no
 * way to delete it for good.
 */
test.group('administrator > listings > archive', (group) => {
  group.each.setup(() => resetDatabase())

  test("when the ad is someone else's and published, answers 204 and it leaves the storefront but not the staff list", async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const session = await authenticateAsModerator(client)
    const row = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      slug: 'golpe',
      neighborhoodId: centro.id,
    })

    const response = await client.delete(url(row.id)).cookies(session)

    response.assertStatus(204)
    const stored = await ListingModel.findOrFail(row.id)
    assert.equal(stored.status, 'ARCHIVED')
    assert.isNotNull(stored.deletedAt)
    const storefront = await client.get('/storefront/listings/golpe')
    storefront.assertStatus(404)
    const show = await client.get(url(row.id)).cookies(session)
    show.assertStatus(200)
    assert.equal(body(show).status, 'ARCHIVED')
  })

  test('when the ad is waiting in the queue, the administrator archives it too', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const session = await authenticateAsAdministrator(client)
    const row = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
    })

    const response = await client.delete(url(row.id)).cookies(session)

    response.assertStatus(204)
    assert.equal((await ListingModel.findOrFail(row.id)).status, 'ARCHIVED')
  })

  test('when archived twice, the second answers 409; when the ad does not exist, 404', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const session = await authenticateAsModerator(client)
    const row = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      neighborhoodId: centro.id,
    })
    await client.delete(url(row.id)).cookies(session)

    const again = await client.delete(url(row.id)).cookies(session)
    const missing = await client.delete(url(MISSING)).cookies(session)

    again.assertStatus(409)
    assert.equal(errorBody(again).code, 'LISTING_ALREADY_ARCHIVED')
    missing.assertStatus(404)
  })

  test('when the caller is an owner, answers 403 and leaves the ad on the air; with no session, 401', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const owner = await authenticateAsOwner(client)
    const row = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      neighborhoodId: centro.id,
    })

    const forbidden = await client.delete(url(row.id)).cookies(owner)
    const anonymous = await client.delete(url(row.id))

    forbidden.assertStatus(403)
    anonymous.assertStatus(401)
    assert.isNull((await ListingModel.findOrFail(row.id)).deletedAt)
  })
})
