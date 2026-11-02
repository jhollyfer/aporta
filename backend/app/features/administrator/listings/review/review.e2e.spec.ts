import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import ListingModel from '#models/listing'
import { resetDatabase } from '#tests/database-fixtures'
import { body, errorBody, object, page } from '#tests/response-fixtures'
import {
  authenticateAsModeratorAccount,
  authenticateAsOwner,
  authenticateAsOwnerAccount,
} from '#tests/session-fixtures'
import { listingWithStatus, neighborhood } from '#tests/storefront-fixtures'

const MISSING = '00000000-0000-4000-8000-000000000000'
const url = (id: string): string => `/administrator/listings/${id}/review`

/**
 * The decision on an ad in the queue, end to end. The contract asserted here is the whole loop:
 * approving puts the ad on the storefront and records who and when; refusing needs a reason, the
 * owner reads it on his own routes, and editing the ad sends it back to the queue.
 */
test.group('administrator > listings > review', (group) => {
  group.each.setup(() => resetDatabase())

  test('when approved, answers 200, the ad reaches the storefront and the decision is recorded', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsModeratorAccount(client)
    const row = await listingWithStatus(LISTING_STATUS.PENDING, {
      slug: 'aprovada',
      neighborhoodId: centro.id,
    })

    const response = await client
      .put(url(row.id))
      .cookies(session)
      .json({ decision: 'APPROVE' })

    response.assertStatus(200)
    assert.equal(body(response).status, 'PUBLISHED')
    const stored = await ListingModel.findOrFail(row.id)
    assert.equal(stored.status, 'PUBLISHED')
    assert.isNotNull(stored.publishedAt)
    assert.equal(stored.reviewedBy, userId)
    assert.isNull(stored.reviewNote)
    const storefront = await client.get('/storefront/listings/aprovada')
    storefront.assertStatus(200)
  })

  test('when refused with a reason, the ad goes back to the owner, who reads the reason on show and on paginate', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const staff = await authenticateAsModeratorAccount(client)
    const owner = await authenticateAsOwnerAccount(client)
    const row = await listingWithStatus(LISTING_STATUS.PENDING, {
      slug: 'recusada',
      neighborhoodId: centro.id,
      ownerId: owner.userId,
    })

    const response = await client.put(url(row.id)).cookies(staff.session).json({
      decision: 'REFUSE',
      note: 'Faltam as fotos do banheiro e da cozinha.',
    })

    response.assertStatus(200)
    assert.equal(body(response).status, 'DRAFT')
    const show = await client
      .get(`/owner/listings/${row.id}`)
      .cookies(owner.session)
    const mine = await client.get('/owner/listings').cookies(owner.session)
    assert.containsSubset(body(show), {
      status: 'DRAFT',
      review: { note: 'Faltam as fotos do banheiro e da cozinha.' },
    })
    assert.containsSubset(page(mine).data[0] ?? {}, {
      review: { note: 'Faltam as fotos do banheiro e da cozinha.' },
    })
    assert.notProperty(object(body(show).review), 'reviewedBy')
    const storefront = await client.get('/storefront/listings/recusada')
    storefront.assertStatus(404)
  })

  test('when the owner edits the refused ad, it returns to the queue and the reason is gone', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const staff = await authenticateAsModeratorAccount(client)
    const owner = await authenticateAsOwnerAccount(client)
    const row = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
      ownerId: owner.userId,
    })
    await client
      .put(url(row.id))
      .cookies(staff.session)
      .json({ decision: 'REFUSE', note: 'Faltam fotos.' })

    const edit = await client
      .put(`/owner/listings/${row.id}`)
      .cookies(owner.session)
      .json({ title: 'Kitnet com fotos novas' })

    edit.assertStatus(200)
    assert.containsSubset(body(edit), { status: 'PENDING', review: null })
    const queue = await client
      .get('/administrator/listings')
      .qs({ status: 'PENDING' })
      .cookies(staff.session)
    assert.equal(page(queue).meta.total, 1)
  })

  test('when refused with no reason or a short one, answers 422 pointing at the note and the ad stays in the queue', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session } = await authenticateAsModeratorAccount(client)
    const row = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
    })

    const absent = await client
      .put(url(row.id))
      .cookies(session)
      .json({ decision: 'REFUSE' })
    const short = await client
      .put(url(row.id))
      .cookies(session)
      .json({ decision: 'REFUSE', note: 'ok' })
    const long = await client
      .put(url(row.id))
      .cookies(session)
      .json({ decision: 'REFUSE', note: 'x'.repeat(501) })

    absent.assertStatus(422)
    assert.equal(errorBody(absent).code, 'LISTING_REVIEW_NOTE_INVALID')
    assert.property(errorBody(absent).errors, 'note')
    short.assertStatus(422)
    long.assertStatus(422)
    assert.equal((await ListingModel.findOrFail(row.id)).status, 'PENDING')
  })

  test('when the ad is not in the queue, answers 409 and does not rewrite the decision', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session } = await authenticateAsModeratorAccount(client)
    const row = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      neighborhoodId: centro.id,
    })

    const response = await client
      .put(url(row.id))
      .cookies(session)
      .json({ decision: 'REFUSE', note: 'Mudei de ideia sobre este.' })

    response.assertStatus(409)
    assert.equal(errorBody(response).code, 'LISTING_NOT_PENDING')
    const stored = await ListingModel.findOrFail(row.id)
    assert.equal(stored.status, 'PUBLISHED')
    assert.isNull(stored.reviewedAt)
  })

  test('when the decision is unknown or the ad does not exist, answers 422 and 404', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session } = await authenticateAsModeratorAccount(client)
    const row = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
    })

    const unknown = await client
      .put(url(row.id))
      .cookies(session)
      .json({ decision: 'MAYBE' })
    const missing = await client
      .put(url(MISSING))
      .cookies(session)
      .json({ decision: 'APPROVE' })

    unknown.assertStatus(422)
    assert.property(errorBody(unknown).errors, 'decision')
    missing.assertStatus(404)
    assert.equal(errorBody(missing).code, 'LISTING_NOT_FOUND')
  })

  test('when the caller is an owner, answers 403 and the ad is not published; with no session, 401', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const owner = await authenticateAsOwner(client)
    const row = await listingWithStatus(LISTING_STATUS.PENDING, {
      neighborhoodId: centro.id,
    })

    const forbidden = await client
      .put(url(row.id))
      .cookies(owner)
      .json({ decision: 'APPROVE' })
    const anonymous = await client
      .put(url(row.id))
      .json({ decision: 'APPROVE' })

    forbidden.assertStatus(403)
    anonymous.assertStatus(401)
    assert.equal((await ListingModel.findOrFail(row.id)).status, 'PENDING')
  })
})
