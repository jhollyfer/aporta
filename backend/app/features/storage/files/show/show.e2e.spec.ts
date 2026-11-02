import { UPLOAD_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import { resetDatabase, storageRecord } from '#tests/database-fixtures'
import { body, errorBody } from '#tests/response-fixtures'
import { authenticateAsAdministrator } from '#tests/session-fixtures'

/**
 * The file is a neutral record: it does not belong to the form that uses it. Who may reach it
 * is `StoragePolicy` (the staff, or the account that uploaded it), and what rules the rest is
 * the state (`PENDING` or `UPLOADED`) and the live reference.
 */

test.group('storage > files > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the file exists, answers 200 with the derived url', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await storageRecord()

    const response = await client
      .get(`/storages/${storage.id}`)
      .cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).id, storage.id)
    assert.equal(body(response).originalName, 'capa.png')
    // Not a column: the use-case signs it from `path` before answering.
    assert.include(body(response).url, storage.path)
  })

  test('when the upload is still PENDING, reaches it', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await storageRecord({ status: UPLOAD_STATUS.PENDING })

    // The detail screen is where one finds out that an upload was left halfway.
    // What requires `UPLOADED` is the attachment, not the read.
    const response = await client
      .get(`/storages/${storage.id}`)
      .cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).status, 'PENDING')
  })

  test('when the id does not exist, answers 404', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .get('/storages/00000000-0000-4000-8000-000000000000')
      .cookies(session)

    response.assertStatus(404)
    assert.equal(errorBody(response).code, 'STORAGE_NOT_FOUND')
  })

  test('when the id is malformed, answers 422 instead of a Postgres 500', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.get('/storages/nao-e-uuid').cookies(session)

    response.assertStatus(422)
    assert.property(errorBody(response).errors, 'id')
  })
})
