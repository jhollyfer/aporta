import app from '@adonisjs/core/services/app'
import {
  LISTING_STATUS,
  REPORT_REASON,
  STORAGE_MIMETYPE,
  TRASHED_MODE,
} from '@aporta/shared'
import { test } from '@japa/runner'

import { ListingPhotoFactory } from '#database/factories/listing-photo.factory'
import ListingModel from '#models/listing'
import ListingPhotoModel from '#models/listing-photo'
import ReportModel from '#models/report'
import StorageRepository from '#repositories/storage/storage.repository'
import StorageContract from '#services/storage/storage.contract'
import { resetDatabase, storageRecord } from '#tests/database-fixtures'
import { errorBody } from '#tests/response-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsModerator,
  authenticateAsOwner,
} from '#tests/session-fixtures'
import {
  archivedListing,
  listingWithStatus,
  neighborhood,
} from '#tests/storefront-fixtures'

const MISSING = '00000000-0000-4000-8000-000000000000'

/** A `string` and not the literal: the typed overload refuses the malformed ids sent on purpose. */
function url(id: string): string {
  return `/administrator/listings/${id}/permanent`
}

/**
 * Deleting an ad for good. The contract asserted here: only the administrator, only an ad that was
 * archived first, never one with a report, and the binary leaves the bucket only when no other
 * photo (the demo seed shares them between ads) points at it.
 */
test.group('administrator > listings > delete', (group) => {
  group.each.setup(() => resetDatabase())

  /** An ad as the archive action leaves it: `ARCHIVED` and in the trash. */
  function archived(neighborhoodId: string) {
    return archivedListing({ neighborhoodId, status: LISTING_STATUS.ARCHIVED })
  }

  /** A finished upload with a real object under its `path`. */
  async function stored(bucket: StorageContract) {
    const row = await storageRecord()
    const put = await bucket.put(
      row.path,
      new Uint8Array([0xff, 0xd8, 0xff]),
      STORAGE_MIMETYPE.JPEG,
    )
    if (put.isLeft()) throw new Error('the bucket refused the test object')

    return row
  }

  async function exists(bucket: StorageContract, path: string) {
    const meta = await bucket.metadata(path)

    return meta.isRight() && meta.value !== null
  }

  test('when the administrator deletes an archived ad, answers 204, it is gone and its orphan photo leaves the bucket', async ({
    client,
    assert,
  }) => {
    const bucket = await app.container.make(StorageContract)
    const files = await app.container.make(StorageRepository)
    const centro = await neighborhood()
    const session = await authenticateAsAdministrator(client)
    const row = await archived(centro.id)
    const file = await stored(bucket)
    await ListingPhotoFactory.merge({
      listingId: row.id,
      position: 0,
      storageId: file.id,
    }).create()

    const response = await client.delete(url(row.id)).cookies(session)

    response.assertStatus(204)
    assert.isNull(await ListingModel.find(row.id))
    assert.lengthOf(
      await ListingPhotoModel.query().where('listingId', row.id),
      0,
    )
    assert.isFalse(await exists(bucket, file.path))
    assert.isNull(await files.findById(file.id, TRASHED_MODE.WITH))
    const show = await client
      .get(`/administrator/listings/${row.id}`)
      .cookies(session)
    show.assertStatus(404)
  })

  test('when another ad shares the photo file, answers 204 but the binary stays in the bucket', async ({
    client,
    assert,
  }) => {
    const bucket = await app.container.make(StorageContract)
    const files = await app.container.make(StorageRepository)
    const centro = await neighborhood()
    const session = await authenticateAsAdministrator(client)
    const gone = await archived(centro.id)
    const kept = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      neighborhoodId: centro.id,
    })
    const shared = await stored(bucket)
    for (const listingId of [gone.id, kept.id]) {
      await ListingPhotoFactory.merge({
        listingId,
        position: 0,
        storageId: shared.id,
      }).create()
    }

    const response = await client.delete(url(gone.id)).cookies(session)

    response.assertStatus(204)
    assert.lengthOf(
      await ListingPhotoModel.query().where('listingId', kept.id),
      1,
    )
    assert.isTrue(await exists(bucket, shared.path))
    assert.isNotNull(await files.findById(shared.id, TRASHED_MODE.WITH))
  })

  test('when the caller is a moderator, answers 403 and the ad stays', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const session = await authenticateAsModerator(client)
    const row = await archived(centro.id)

    const response = await client.delete(url(row.id)).cookies(session)

    response.assertStatus(403)
    assert.isNotNull(await ListingModel.find(row.id))
  })

  test('when the caller is an owner, answers 403; with no session, 401', async ({
    client,
  }) => {
    const centro = await neighborhood()
    const owner = await authenticateAsOwner(client)
    const row = await archived(centro.id)

    const forbidden = await client.delete(url(row.id)).cookies(owner)
    const anonymous = await client.delete(url(row.id))

    forbidden.assertStatus(403)
    anonymous.assertStatus(401)
  })

  test('when the ad is still published, answers 409 LISTING_NOT_ARCHIVED and keeps it on the air', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const session = await authenticateAsAdministrator(client)
    const row = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      neighborhoodId: centro.id,
    })

    const response = await client.delete(url(row.id)).cookies(session)

    response.assertStatus(409)
    assert.equal(errorBody(response).code, 'LISTING_NOT_ARCHIVED')
    assert.isNotNull(await ListingModel.find(row.id))
  })

  test('when the ad has a report, answers 409 LISTING_HAS_REPORTS and keeps ad and report', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const session = await authenticateAsAdministrator(client)
    const row = await archived(centro.id)
    await ReportModel.create({
      listingId: row.id,
      reason: REPORT_REASON.SCAM,
      status: 'OPEN',
    })

    const response = await client.delete(url(row.id)).cookies(session)

    response.assertStatus(409)
    assert.equal(errorBody(response).code, 'LISTING_HAS_REPORTS')
    assert.isNotNull(await ListingModel.find(row.id))
    assert.lengthOf(await ReportModel.query().where('listingId', row.id), 1)
  })

  test('when the ad does not exist, answers 404', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.delete(url(MISSING)).cookies(session)

    response.assertStatus(404)
  })
})
