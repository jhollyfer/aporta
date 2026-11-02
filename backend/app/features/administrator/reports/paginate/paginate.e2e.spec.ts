import { LISTING_STATUS, REPORT_REASON } from '@aporta/shared'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { resetDatabase } from '#tests/database-fixtures'
import { reportRow } from '#tests/report-fixtures'
import { errorBody, page, present } from '#tests/response-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsModerator,
  authenticateAsOwner,
} from '#tests/session-fixtures'
import { listingWithStatus, neighborhood } from '#tests/storefront-fixtures'

const URL: string = '/administrator/reports'

test.group('administrator > reports > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the open ones are asked for, the oldest comes first, with the ad and a short reporter key', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const session = await authenticateAsModerator(client)
    const row = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      slug: 'casa',
      title: 'Casa do centro',
      neighborhoodId: centro.id,
    })
    const recent = await reportRow(row.id, {
      createdAt: DateTime.fromISO('2026-10-20T12:00:00Z'),
    })
    const old = await reportRow(
      row.id,
      {
        createdAt: DateTime.fromISO('2026-10-01T12:00:00Z'),
        details: 'Pediu Pix',
      },
      REPORT_REASON.FAKE_PHOTOS,
    )

    const response = await client
      .get(URL)
      .qs({ status: 'OPEN' })
      .cookies(session)

    response.assertStatus(200)
    const { data } = page(response)
    assert.deepEqual(
      data.map((each) => each.id),
      [old.id, recent.id],
    )
    assert.containsSubset(present(data[0], 'the oldest report'), {
      reason: 'FAKE_PHOTOS',
      details: 'Pediu Pix',
      status: 'OPEN',
      reporter: 'c'.repeat(12),
      listing: { id: row.id, slug: 'casa', title: 'Casa do centro' },
    })
    assert.notProperty(present(data[0], 'the oldest report'), 'reporterHash')
  })

  test('when the resolved ones are asked for, only they come back; the report of an archived ad is still there', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const session = await authenticateAsAdministrator(client)
    const row = await listingWithStatus(LISTING_STATUS.ARCHIVED, {
      neighborhoodId: centro.id,
      deletedAt: DateTime.now(),
    })
    await reportRow(row.id)
    const done = await reportRow(row.id, {
      status: 'RESOLVED',
      resolvedAt: DateTime.now(),
      resolutionNote: 'Conferido',
    })

    const resolved = await client
      .get(URL)
      .qs({ status: 'RESOLVED' })
      .cookies(session)
    const all = await client.get(URL).cookies(session)

    assert.deepEqual(
      page(resolved).data.map((each) => each.id),
      [done.id],
    )
    assert.equal(page(all).meta.total, 2)
  })

  test('when the status is unknown, answers 422; an owner gets 403; no session, 401', async ({
    client,
    assert,
  }) => {
    const staff = await authenticateAsModerator(client)
    const owner = await authenticateAsOwner(client)

    const unknown = await client.get(URL).qs({ status: 'DONE' }).cookies(staff)
    const forbidden = await client.get(URL).cookies(owner)
    const anonymous = await client.get(URL)

    unknown.assertStatus(422)
    assert.property(errorBody(unknown).errors, 'status')
    forbidden.assertStatus(403)
    anonymous.assertStatus(401)
  })
})
