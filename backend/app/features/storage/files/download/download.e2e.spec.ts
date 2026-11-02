import { test } from '@japa/runner'

import { resetDatabase } from '#tests/database-fixtures'
import { errorBody } from '#tests/response-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsModerator,
} from '#tests/session-fixtures'
import { upload } from '#tests/storage-fixtures'

/**
 * The file is a neutral record: it does not belong to the form that uses it. Who may reach it
 * is `StoragePolicy` (the staff, or the account that uploaded it), and what rules the rest is
 * the state (`PENDING` or `UPLOADED`) and the live reference.
 */

test.group('storage > files > download', (group) => {
  group.each.setup(() => resetDatabase())

  test('when there is no session, refuses', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    // With the bucket private, this route is the only path to the binary. Open,
    // it issued a signed URL for any uuid without a session - the back door
    // that closing the bucket left open.
    const response = await client
      .get(`/storages/${storage.id}/download`)
      .redirects(0)

    response.assertStatus(401)
  })

  test('when the file exists, redirects to a temporary bucket URL', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    // Without following the redirect, to see what the **application** answers.
    const response = await client
      .get(`/storages/${storage.id}/download`)
      .cookies(session)
      .redirects(0)

    response.assertStatus(302)

    const location = response.header('location')

    // Signed and temporary: never the raw, permanent URL of the object.
    assert.include(location, 'X-Amz-Signature')
    assert.include(location, 'X-Amz-Expires')
  })

  test('when the redirect ends, the file arrives with the original name', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    const response = await client
      .get(`/storages/${storage.id}/download`)
      .cookies(session)

    response.assertStatus(200)

    const disposition = response.header('content-disposition')

    assert.include(disposition, 'attachment')
    // Both names, as RFC 6266 asks.
    assert.include(disposition, 'filename="capa.png"')
    assert.include(disposition, "filename*=UTF-8''capa.png")
  })

  test('when the moderator downloads, succeeds because both staff roles operate the collection', async ({
    client,
  }) => {
    const administrator = await authenticateAsAdministrator(client)
    const storage = await upload(client, administrator)

    const moderator = await authenticateAsModerator(client)

    const response = await client
      .get(`/storages/${storage.id}/download`)
      .cookies(moderator)
      .redirects(0)

    response.assertStatus(302)
  })

  test('when the id does not exist, answers 404', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const response = await client
      .get('/storages/00000000-0000-4000-8000-000000000000/download')
      .cookies(session)

    response.assertStatus(404)
    assert.equal(errorBody(response).code, 'STORAGE_NOT_FOUND')
  })
})
