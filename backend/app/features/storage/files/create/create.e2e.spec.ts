import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import Storage from '#models/storage'
import UserModel from '#models/user'
import { PART_SIZE } from '#services/multipart/multipart.contract'
import { resetDatabase } from '#tests/database-fixtures'
import { errorBody, present } from '#tests/response-fixtures'
import {
  ADMINISTRATOR,
  authenticateAsAdministrator,
  authenticateAsModerator,
} from '#tests/session-fixtures'
import { SMALL, open } from '#tests/storage-fixtures'
import {
  StorageFileCreateValidator,
  UPLOAD_MAX_SIZE,
} from '#validators/storage/files.validator'

/**
 * The file as a neutral, shared record: it does not belong to the
 * form that sent it, and ownership authorizes nothing. What rules is the state
 * (`PENDING` or `UPLOADED`) and the live reference.
 */

/** The same refusal over HTTP: the envelope and the request language. */
test.group('storage > files > create > validator > envelope', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the file name has a control character over HTTP, answers 422 pointing at the field in the request language', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/storages')
      .cookies(session)
      .header('Accept-Language', 'pt-BR')
      .json({ fileName: 'a\u001b[2J.png', mimetype: 'image/png', size: 128 })

    response.assertStatus(422)
    const error = errorBody(response)
    assert.equal(error.code, 'VALIDATION_ERROR')
    assert.deepEqual(error.errors, {
      fileName: 'O nome do arquivo não pode ter caracteres de controle',
    })
  })
})

/**
 * What is refused **before** any signing.
 *
 * Directly in the validator, and not over HTTP, because that is where the refusal happens: the
 * controller validates before calling the use-case, and the use-case is the only one that talks
 * to the bucket. A forbidden file gets no URL, so it never reaches the bucket.
 */
test.group('storage > files > create > validator', () => {
  test('when the mimetype is outside the list, refuses', async ({ assert }) => {
    await assert.rejects(() =>
      StorageFileCreateValidator.validate({
        fileName: 'script.sh',
        mimetype: 'application/x-sh',
        size: 128,
      }),
    )
  })

  test('when the file name has a control character, refuses', async ({
    assert,
  }) => {
    // NUL, ESC, CR, DEL and a C1 one (NEL): the name reaches terminals and logs.
    for (const fileName of [
      'a\u0000.png',
      'a\u001b[2J.png',
      'a\r.png',
      'a\u007f.png',
      'a\u0085.png',
    ]) {
      await assert.rejects(() =>
        StorageFileCreateValidator.validate({
          fileName,
          mimetype: 'image/png',
          size: 128,
        }),
      )
    }
  })

  test('when the file name is printable, accepts accents, spaces and emoji', async ({
    assert,
  }) => {
    const payload = await StorageFileCreateValidator.validate({
      fileName: 'Relatório de ação 📎.png',
      mimetype: 'image/png',
      size: 128,
    })

    assert.equal(payload.fileName, 'Relatório de ação 📎.png')
  })

  /**
   * Against the environment ceiling, and not a number written here: since
   * `UPLOAD_MAX_SIZE` is required, this test remains valid whatever
   * the configured value is.
   */
  test('when the size is above the environment ceiling, refuses', async ({
    assert,
  }) => {
    await assert.rejects(() =>
      StorageFileCreateValidator.validate({
        fileName: 'gigante.pdf',
        mimetype: 'application/pdf',
        size: UPLOAD_MAX_SIZE + 1,
      }),
    )
  })

  test('when the size is at the ceiling, accepts', async ({ assert }) => {
    const payload = await StorageFileCreateValidator.validate({
      fileName: 'grande.pdf',
      mimetype: 'application/pdf',
      size: UPLOAD_MAX_SIZE,
    })

    assert.equal(payload.size, UPLOAD_MAX_SIZE)
  })
})

test.group('storage > files > create', (group) => {
  group.each.setup(() => resetDatabase())

  test('when a file fits in one part, gets a single URL, without uploadId', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: 2 * 1024 * 1024,
    })

    assert.isNull(opened.uploadId)
    assert.equal(opened.totalParts, 1)
    assert.lengthOf(opened.parts, 1)
    assert.equal(opened.storage.status, 'PENDING')
    // The sent name is a label, never a path: the key is a uuid + extension
    // derived from the mimetype.
    assert.equal(opened.storage.originalName, 'capa.png')
    assert.notInclude(opened.storage.path, 'capa')
    assert.match(opened.storage.path, /\.png$/)
  })

  test('when a file is larger, is sliced, and the number of URLs comes from the size', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    // Two full parts and a remainder: the `ceil` has to count the remainder.
    const opened = await open(client, session, {
      fileName: 'edital.pdf',
      mimetype: 'application/pdf',
      size: PART_SIZE * 2 + 1,
    })

    assert.isNotNull(opened.uploadId)
    assert.equal(opened.totalParts, 3)
    assert.equal(opened.partSize, PART_SIZE)
    assert.deepEqual(
      opened.parts.map((part) => part.partNumber),
      [1, 2, 3],
    )
  })

  /**
   * `size` is `bigint` in the database. With `integer`, this `POST` would pass
   * validation - the environment ceiling allows it - and blow up on the `INSERT`, because
   * `int4` stops at 2.1 GB. The test declares 4 GiB and transfers nothing: only the
   * metadata travels, and the row is born `PENDING`.
   *
   * The assertion on the envelope is the wire: the driver returns `int8` as a string, and
   * without the model's `consume` the `size` would come out quoted.
   */
  test('when the size is above the int4 ceiling, accepts', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const size = 4 * 1024 ** 3

    const opened = await open(client, session, {
      fileName: 'acervo.pdf',
      mimetype: 'application/pdf',
      size,
    })

    assert.strictEqual(opened.storage.size, size)

    const stored = await Storage.findOrFail(opened.storage.id)
    assert.strictEqual(stored.size, size)
  })

  test('when there is no session, requires one', async ({ client }) => {
    const response = await client
      .post('/storages')
      .json({ fileName: 'a.png', mimetype: 'image/png', size: 1 })

    response.assertStatus(401)
  })
})

/**
 * The upload ceiling (`uploadThrottle`) counts per user, and only on the writes that
 * open an upload.
 *
 * The administrator counter is seeded at the ceiling, in the database: spending sixty
 * requests over HTTP just to reach the limit would say nothing more.
 */
test.group('storage > files > create > upload ceiling', (group) => {
  group.each.setup(() => resetDatabase())

  async function exhaustAdministratorQuota() {
    const user = await UserModel.findByOrFail('email', ADMINISTRATOR.email)

    await db.table('rate_limits').insert({
      key: `rlflx:upload_user_${user.id}`,
      points: 60,
      expire: Date.now() + 60 * 60 * 1000,
    })
  }

  test('when the quota is exhausted, refuses opening the upload with 429', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    await exhaustAdministratorQuota()

    const response = await client
      .post('/storages')
      .cookies(session)
      .json({ fileName: 'a.png', mimetype: 'image/png', size: 1 })

    response.assertStatus(429)
    assert.equal(errorBody(response).code, 'TOO_MANY_REQUESTS')
  })

  test('when the quota is exhausted, refuses the complete with 429', async ({
    client,
  }) => {
    const session = await authenticateAsAdministrator(client)
    await exhaustAdministratorQuota()

    const response = await client
      .post('/storages/00000000-0000-4000-8000-000000000000/complete')
      .cookies(session)
      .json({})

    response.assertStatus(429)
  })

  test('when the call is a library read, neither spends nor suffers the ceiling', async ({
    client,
  }) => {
    const session = await authenticateAsAdministrator(client)
    await exhaustAdministratorQuota()

    const response = await client.get('/storages').cookies(session)

    response.assertStatus(200)
  })

  test('when another user opens an upload, the quota is per user', async ({
    client,
    assert,
  }) => {
    await authenticateAsAdministrator(client)
    await exhaustAdministratorQuota()
    const moderator = await authenticateAsModerator(client)

    const response = await client
      .post('/storages')
      .cookies(moderator)
      .json({ fileName: 'a.png', mimetype: 'image/png', size: 1 })

    assert.notEqual(response.status(), 429)
    response.assertStatus(201)
  })

  test('when the PUT carries another type than the one signed at create, the bucket answers 403', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: SMALL.byteLength,
    })

    const refused = await fetch(present(opened.parts[0], 'part 1').url, {
      method: 'PUT',
      body: SMALL,
      headers: { 'Content-Type': 'image/svg+xml' },
    })

    assert.equal(refused.status, 403)
  })

  test('when the PUT carries another size than the one signed at create, the bucket answers 403', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: SMALL.byteLength,
    })

    const refused = await fetch(present(opened.parts[0], 'part 1').url, {
      method: 'PUT',
      body: new Uint8Array(SMALL.byteLength + 1),
      headers: { 'Content-Type': 'image/png' },
    })

    assert.equal(refused.status, 403)
  })

  test('when the upload is opened, the file belongs to the authenticated account', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: SMALL.byteLength,
    })

    const stored = await Storage.findOrFail(opened.storage.id)
    const administrator = await UserModel.findByOrFail(
      'email',
      ADMINISTRATOR.email,
    )

    assert.equal(stored.ownerId, administrator.id)
  })
})
