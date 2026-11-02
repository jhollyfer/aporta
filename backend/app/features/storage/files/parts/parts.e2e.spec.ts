import { test } from '@japa/runner'

import { PART_SIZE } from '#services/multipart/multipart.contract'
import { resetDatabase } from '#tests/database-fixtures'
import { body, list, object, present } from '#tests/response-fixtures'
import { authenticateAsAdministrator } from '#tests/session-fixtures'
import {
  FULL_PART,
  SMALL,
  UploadPlanValidator,
  open,
  put,
  upload,
} from '#tests/storage-fixtures'

/**
 * The file is a neutral record: it does not belong to the form that uses it. Who may reach it
 * is `StoragePolicy` (the staff, or the account that uploaded it), and what rules the rest is
 * the state (`PENDING` or `UPLOADED`) and the live reference.
 */

test.group('storage > files > parts', (group) => {
  group.each.setup(() => resetDatabase())

  test('when parts were uploaded, lists them and signs only what is missing', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'galeria.png',
      mimetype: 'image/png',
      size: PART_SIZE * 2 + SMALL.byteLength,
    })

    assert.equal(opened.totalParts, 3)

    // Uploads the first two and "drops" before the third.
    await put(present(opened.parts[0], 'part 1').url, FULL_PART)
    await put(present(opened.parts[1], 'part 2').url, FULL_PART)

    const response = await client
      .get(`/storages/${opened.storage.id}/parts`)
      .cookies(session)

    response.assertStatus(200)

    const resumed = await UploadPlanValidator.validate(body(response))

    assert.deepEqual(
      resumed.uploaded.map((part) => part.partNumber),
      [1, 2],
    )
    assert.deepEqual(
      resumed.parts.map((part) => part.partNumber),
      [3],
    )
    assert.equal(resumed.totalParts, 3)
    assert.equal(resumed.partSize, PART_SIZE)
  })

  test('when the returned URL is used, really uploads so re-signing cannot give a broken address', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'galeria.png',
      mimetype: 'image/png',
      size: PART_SIZE + SMALL.byteLength,
    })

    const response = await client
      .get(`/storages/${opened.storage.id}/parts`)
      .cookies(session)

    const resumed = await UploadPlanValidator.validate(body(response))
    await put(present(resumed.parts[0], 'part 1').url, FULL_PART)

    const after = await client
      .get(`/storages/${opened.storage.id}/parts`)
      .cookies(session)

    assert.lengthOf(list(body(after).uploaded), 1)
  })

  test('when the file is already confirmed, answers with empty lists', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    const response = await client
      .get(`/storages/${storage.id}/parts`)
      .cookies(session)

    response.assertStatus(200)
    assert.isEmpty(body(response).parts)
    assert.isEmpty(list(body(response).uploaded))
    assert.equal(object(body(response).storage).status, 'UPLOADED')
  })
})
