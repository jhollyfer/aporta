import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import ListingModel from '#models/listing'
import { resetDatabase } from '#tests/database-fixtures'
import { body, errorBody, object } from '#tests/response-fixtures'
import { authenticateAsOwnerAccount } from '#tests/session-fixtures'
import { listingWithStatus, neighborhood } from '#tests/storefront-fixtures'

/**
 * A `string` base and not the literal: the typed overload refuses the keys these cases send on
 * purpose (a `status`, an `ownerId`, a `slug` that must be dropped).
 */
function url(id: string): string {
  return `/owner/listings/${id}`
}

/**
 * Editing an ad. The contract asserted here: a partial body changes only what it names, the
 * state and the address are not the body's to move, the contact change clears the verification,
 * and an ad of another account is never touched (and answers like a missing one).
 */
test.group('owner > listings > update', (group) => {
  group.each.setup(() => resetDatabase())

  test('when fields are sent, answers 200 with them changed and the rest as it was', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const row = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
      ownerId: userId,
      title: 'Kitnet antiga',
    })

    const response = await client
      .put(url(row.id))
      .cookies(session)
      .json({ title: 'Kitnet reformada', monthly: 750, rules: 'Sem festa' })

    response.assertStatus(200)
    assert.equal(body(response).title, 'Kitnet reformada')
    assert.deepEqual(body(response).price, { monthly: 750, daily: null })
    assert.deepEqual(body(response).rules, ['Sem festa'])
    assert.equal(body(response).address, row.address)
    const stored = await ListingModel.findOrFail(row.id)
    assert.equal(stored.priceMonthly, 750)
    assert.equal(stored.slug, row.slug)
  })

  test('when the body names a status, a slug and an owner, they are ignored', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const row = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })

    const response = await client.put(url(row.id)).cookies(session).json({
      title: 'Outro título qualquer',
      status: 'PUBLISHED',
      slug: 'novo-endereco',
      ownerId: '00000000-0000-4000-8000-000000000001',
    })

    response.assertStatus(200)
    const stored = await ListingModel.findOrFail(row.id)
    assert.equal(stored.status, 'PENDING')
    assert.equal(stored.slug, row.slug)
    assert.equal(stored.ownerId, userId)
  })

  test('when the contact changes, the owner verification is cleared', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const row = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      neighborhoodId: centro.id,
      ownerId: userId,
      ownerVerifiedAt: DateTime.now(),
    })

    const response = await client
      .put(url(row.id))
      .cookies(session)
      .json({ whatsapp: '5597999990099' })

    response.assertStatus(200)
    assert.isFalse(object(body(response).owner).verified)
    const stored = await ListingModel.findOrFail(row.id)
    assert.isNull(stored.ownerVerifiedAt)
    assert.equal(stored.ownerWhatsapp, '5597999990099')
  })

  test('when the neighborhood changes, the pin follows it', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood({ slug: 'centro' })
    await neighborhood({
      slug: 'colonia',
      name: 'Colônia',
      lat: -4.4,
      lng: -70.1,
    })
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const row = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })

    const response = await client
      .put(url(row.id))
      .cookies(session)
      .json({ neighborhood: 'colonia' })

    response.assertStatus(200)
    assert.equal(body(response).lat, -4.4)
    assert.equal(body(response).lng, -70.1)
  })

  test("when the ad is another account's, answers 404 and does not touch it", async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const other = await authenticateAsOwnerAccount(client)
    const { session } = await authenticateAsOwnerAccount(client)
    const foreign = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      neighborhoodId: centro.id,
      ownerId: other.userId,
      title: 'Título original',
    })

    const response = await client
      .put(url(foreign.id))
      .cookies(session)
      .json({ title: 'Título sequestrado' })

    response.assertStatus(404)
    assert.equal(errorBody(response).code, 'LISTING_NOT_FOUND')
    assert.equal(
      (await ListingModel.findOrFail(foreign.id)).title,
      'Título original',
    )
  })

  test('when the neighborhood does not exist, answers 422 and changes nothing', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const row = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
      ownerId: userId,
      title: 'Título original',
    })

    const response = await client
      .put(url(row.id))
      .cookies(session)
      .json({ title: 'Título trocado aqui', neighborhood: 'nenhum' })

    response.assertStatus(422)
    assert.equal(errorBody(response).code, 'NEIGHBORHOOD_NOT_FOUND')
    assert.equal(
      (await ListingModel.findOrFail(row.id)).title,
      'Título original',
    )
  })

  test('when a field breaks a rule, answers 422 pointing at it', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const row = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
      ownerId: userId,
    })

    const response = await client
      .put(url(row.id))
      .cookies(session)
      .json({ monthly: 900_000, periods: [] })

    response.assertStatus(422)
    assert.sameMembers(Object.keys(errorBody(response).errors ?? {}), [
      'monthly',
      'periods',
    ])
  })

  test('when there is no session, answers 401', async ({ client }) => {
    const response = await client
      .put(url('00000000-0000-4000-8000-000000000000'))
      .json({})

    response.assertStatus(401)
  })
})
