import { createHmac } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import ReportModel from '#models/report'
import env from '#start/env'
import { countRows, resetDatabase } from '#tests/database-fixtures'
import { body, errorBody } from '#tests/response-fixtures'
import { listingWithStatus, neighborhood } from '#tests/storefront-fixtures'

/** A `string`: the typed overload would refuse the malformed bodies these cases send on purpose. */
const URL: string = '/storefront/reports'

/**
 * The public scam report. The contract asserted here: no session needed, the address is never
 * stored (only its keyed hash), a bot's honeypot is answered like a success and kept out, an ad
 * that is not on the air is the same 404 as one that does not exist, and the per-IP ceiling holds.
 */
test.group('storefront > reports > create', (group) => {
  group.each.setup(() => resetDatabase())

  test('when a visitor reports a published ad, answers 201 with the id and stores the report with a keyed hash and no address', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const row = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      slug: 'casa',
      neighborhoodId: centro.id,
    })

    const response = await client.post(URL).json({
      slug: 'casa',
      reason: 'SCAM',
      details: 'Pediu um Pix de sinal antes de mostrar a casa.',
    })

    response.assertStatus(201)
    const stored = await ReportModel.findOrFail(String(body(response).id))
    assert.equal(stored.listingId, row.id)
    assert.equal(stored.status, 'OPEN')
    assert.equal(stored.reason, 'SCAM')
    assert.equal(
      stored.details,
      'Pediu um Pix de sinal antes de mostrar a casa.',
    )
    const expected = createHmac('sha256', env.get('APP_KEY').release())
      .update('reporter:127.0.0.1')
      .digest('hex')
    assert.equal(stored.reporterHash, expected)
    assert.notInclude(JSON.stringify(stored.serialize()), '127.0.0.1')
  })

  test('when only the reason is sent, the report is valid', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      slug: 'casa',
      neighborhoodId: centro.id,
    })

    const response = await client
      .post(URL)
      .json({ slug: 'casa', reason: 'NOT_AVAILABLE' })

    response.assertStatus(201)
    assert.isNull(
      (await ReportModel.findOrFail(String(body(response).id))).details,
    )
  })

  test('when the honeypot is filled, answers 201 like any other and stores nothing', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      slug: 'casa',
      neighborhoodId: centro.id,
    })

    const response = await client
      .post(URL)
      .json({ slug: 'casa', reason: 'SCAM', website: 'http://spam.example' })

    response.assertStatus(201)
    assert.isString(body(response).id)
    assert.equal(await countRows(db.from('reports').count('* as count')), 0)
  })

  test('when the ad is a draft, in the queue, archived or does not exist, answers the same 404', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    for (const status of [
      LISTING_STATUS.DRAFT,
      LISTING_STATUS.PENDING,
      LISTING_STATUS.ARCHIVED,
    ])
      await listingWithStatus(status, {
        slug: `em-${status.toLowerCase()}`,
        neighborhoodId: centro.id,
      })

    for (const slug of [
      'em-draft',
      'em-pending',
      'em-archived',
      'nao-existe',
    ]) {
      const response = await client.post(URL).json({ slug, reason: 'SCAM' })

      response.assertStatus(404)
      assert.equal(errorBody(response).code, 'LISTING_NOT_FOUND')
    }
    assert.equal(await countRows(db.from('reports').count('* as count')), 0)
  })

  test('when the body is wrong, answers 422 pointing at each field', async ({
    client,
    assert,
  }) => {
    const missing = await client.post(URL).json({})
    const bad = await client.post(URL).json({
      slug: 'casa',
      reason: 'ANNOYING',
      details: 'x'.repeat(501),
    })

    missing.assertStatus(422)
    for (const field of ['slug', 'reason'])
      assert.property(errorBody(missing).errors, field)
    bad.assertStatus(422)
    for (const field of ['reason', 'details'])
      assert.property(errorBody(bad).errors, field)
  })

  test('when the per-IP ceiling is exceeded, answers 429 and stores nothing', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      slug: 'casa',
      neighborhoodId: centro.id,
    })
    await db.table('rate_limits').insert({
      key: 'rlflx:reportCreate_ip_127.0.0.1',
      points: 5,
      expire: Date.now() + 60 * 60 * 1000,
    })

    const response = await client
      .post(URL)
      .json({ slug: 'casa', reason: 'SCAM' })

    response.assertStatus(429)
    assert.equal(errorBody(response).code, 'TOO_MANY_REQUESTS')
    assert.equal(await countRows(db.from('reports').count('* as count')), 0)
  })
})
