import { randomUUID } from 'node:crypto'

import app from '@adonisjs/core/services/app'
import drive from '@adonisjs/drive/services/main'
import { UPLOAD_STATUS, type UploadStatus } from '@aporta/shared'
import { test } from '@japa/runner'

import StorageContract from '#services/storage/storage.contract'
import { resetDatabase, storageRecord } from '#tests/database-fixtures'
import { body, errorBody, object } from '#tests/response-fixtures'
import { authenticateAsAdministrator } from '#tests/session-fixtures'

/**
 * The file is a neutral record: it does not belong to the form that uses it. Who may reach it
 * is `StoragePolicy` (the staff, or the account that uploaded it), and what rules the rest is
 * the state (`PENDING` or `UPLOADED`) and the live reference.
 */

/** A `storages` row with no binary at all: only the metadata matters here. */
function record(status: UploadStatus) {
  return storageRecord({
    filename: 'a3f1c0de-0000-4000-8000-000000000000.png',
    originalName: 'capa.png',
    path: 'a3f1c0de-0000-4000-8000-000000000000.png',
    status,
  })
}

/**
 * `StorageRepository.allUploaded` is what separates "the row exists" from "the file
 * is intact". Since the binary goes straight to the bucket, the
 * row is born before the file, and attaching a `PENDING` would publish a photo that
 * is still halfway there - the screen would show a 404.
 */
test.group('services > storage > attach', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the file is still PENDING, refuses attaching it with 422', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await record(UPLOAD_STATUS.PENDING)

    const response = await client
      .put('/account')
      .cookies(session)
      .json({ avatarId: storage.id })

    response.assertStatus(422)
    assert.equal(errorBody(response).code, 'STORAGE_NOT_FOUND')
  })

  /**
   * The pair of the test above: without it, an `allUploaded` that refused **everything**
   * would pass the refusal by vacuity.
   */
  test('when the file is UPLOADED, accepts attaching it', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await record(UPLOAD_STATUS.UPLOADED)

    const response = await client
      .put('/account')
      .cookies(session)
      .json({ avatarId: storage.id })

    response.assertStatus(200)
    assert.equal(object(body(response).avatar).id, storage.id)
  })
})

/**
 * The bucket's typed answers (`StorageContract`): a missing object is `null` / success, not a
 * failure, so the use-cases can tell "nothing there" from "the bucket is down".
 */
test.group('services > storage > bucket answers', () => {
  test('when asking for metadata, returns null for an object that does not exist and the data for one that does', async ({
    assert,
  }) => {
    const storage = await app.container.make(StorageContract)
    const key = `${randomUUID()}.txt`

    const missing = await storage.metadata(key)

    assert.isTrue(missing.isRight())
    assert.isNull(missing.value)

    await drive.use().put(key, 'abc')
    const found = await storage.metadata(key)

    assert.containsSubset(found.value, { contentLength: 3 })

    await storage.discard(key)
  })

  test('when discarding, removes the object, and an object already gone is success', async ({
    assert,
  }) => {
    const storage = await app.container.make(StorageContract)
    const key = `${randomUUID()}.txt`
    await drive.use().put(key, 'abc')

    const first = await storage.discard(key)
    const again = await storage.discard(key)

    assert.isTrue(first.isRight())
    assert.isTrue(again.isRight())
    assert.isFalse(await drive.use().exists(key))
  })

  test('when reading the head, returns only the first bytes, and null for an object that does not exist', async ({
    assert,
  }) => {
    const storage = await app.container.make(StorageContract)
    const key = `${randomUUID()}.txt`

    const missing = await storage.readHead(key, 4)

    assert.isTrue(missing.isRight())
    assert.isNull(missing.value)

    await drive.use().put(key, 'abcdefghij')
    const head = await storage.readHead(key, 4)

    if (head.isLeft() || head.value === null) return assert.fail('no head')

    assert.equal(new TextDecoder().decode(head.value), 'abcd')

    await storage.discard(key)
  })
})
