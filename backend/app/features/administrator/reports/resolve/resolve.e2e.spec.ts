import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import ListingModel from '#models/listing'
import ReportModel from '#models/report'
import { resetDatabase } from '#tests/database-fixtures'
import { reportRow } from '#tests/report-fixtures'
import { body, errorBody } from '#tests/response-fixtures'
import {
  authenticateAsModeratorAccount,
  authenticateAsOwner,
} from '#tests/session-fixtures'
import { listingWithStatus, neighborhood } from '#tests/storefront-fixtures'

const MISSING = '00000000-0000-4000-8000-000000000000'
const url = (id: string): string => `/administrator/reports/${id}/resolution`

async function openReport() {
  const centro = await neighborhood()
  const listing = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
    neighborhoodId: centro.id,
  })

  return { listing, report: await reportRow(listing.id) }
}

test.group('administrator > reports > resolve', (group) => {
  group.each.setup(() => resetDatabase())

  test('when resolved, answers 200 with the author, the instant and the note, and the ad stays on the air', async ({
    client,
    assert,
  }) => {
    const { session, userId } = await authenticateAsModeratorAccount(client)
    const { listing, report } = await openReport()

    const response = await client
      .put(url(report.id))
      .cookies(session)
      .json({ note: 'Falei com o dono, o imóvel existe.' })

    response.assertStatus(200)
    assert.containsSubset(body(response), {
      status: 'RESOLVED',
      resolvedBy: userId,
      resolutionNote: 'Falei com o dono, o imóvel existe.',
    })
    assert.isString(body(response).resolvedAt)
    const stored = await ReportModel.findOrFail(report.id)
    assert.equal(stored.status, 'RESOLVED')
    assert.equal(stored.resolvedBy, userId)
    assert.isNull((await ListingModel.findOrFail(listing.id)).deletedAt)
  })

  test('when resolved twice, the second answers 409 and the first note stays', async ({
    client,
    assert,
  }) => {
    const { session } = await authenticateAsModeratorAccount(client)
    const { report } = await openReport()
    await client
      .put(url(report.id))
      .cookies(session)
      .json({ note: 'Primeira nota' })

    const again = await client
      .put(url(report.id))
      .cookies(session)
      .json({ note: 'Segunda nota' })

    again.assertStatus(409)
    assert.equal(errorBody(again).code, 'REPORT_ALREADY_RESOLVED')
    assert.equal(
      (await ReportModel.findOrFail(report.id)).resolutionNote,
      'Primeira nota',
    )
  })

  test('when the note is missing, short or too long, answers 422 on the note and the report stays OPEN', async ({
    client,
    assert,
  }) => {
    const { session } = await authenticateAsModeratorAccount(client)
    const { report } = await openReport()

    for (const payload of [{}, { note: 'ok' }, { note: 'x'.repeat(501) }]) {
      const response = await client
        .put(url(report.id))
        .cookies(session)
        .json(payload)

      response.assertStatus(422)
      assert.property(errorBody(response).errors, 'note')
    }
    assert.equal((await ReportModel.findOrFail(report.id)).status, 'OPEN')
  })

  test('when the report does not exist, answers 404; an owner gets 403; no session, 401', async ({
    client,
    assert,
  }) => {
    const { session } = await authenticateAsModeratorAccount(client)
    const owner = await authenticateAsOwner(client)
    const { report } = await openReport()

    const missing = await client
      .put(url(MISSING))
      .cookies(session)
      .json({ note: 'Qualquer nota' })
    const forbidden = await client
      .put(url(report.id))
      .cookies(owner)
      .json({ note: 'Qualquer nota' })
    const anonymous = await client
      .put(url(report.id))
      .json({ note: 'Qualquer nota' })

    missing.assertStatus(404)
    assert.equal(errorBody(missing).code, 'REPORT_NOT_FOUND')
    forbidden.assertStatus(403)
    anonymous.assertStatus(401)
    assert.equal((await ReportModel.findOrFail(report.id)).status, 'OPEN')
  })
})
