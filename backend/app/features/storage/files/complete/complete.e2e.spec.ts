import drive from '@adonisjs/drive/services/main'
import { test } from '@japa/runner'

import { bucket } from '#config/drive'
import Storage from '#models/storage'
import { PART_SIZE } from '#services/multipart/multipart.contract'
import env from '#start/env'
import { resetDatabase } from '#tests/database-fixtures'
import { body, errorBody, present } from '#tests/response-fixtures'
import { authenticateAsAdministrator } from '#tests/session-fixtures'
import { FULL_PART, SMALL, open, put, upload } from '#tests/storage-fixtures'

/**
 * The file is a neutral record: it does not belong to the form that uses it. Who may reach it
 * is `StoragePolicy` (the staff, or the account that uploaded it), and what rules the rest is
 * the state (`PENDING` or `UPLOADED`) and the live reference.
 */

test.group('storage > files > complete', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the upload is confirmed, the file becomes UPLOADED', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    assert.equal(storage.status, 'UPLOADED')
    assert.isTrue(await drive.use().exists(storage.path))
  })

  test('when the upload is multipart, reassembles the parts', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const size = PART_SIZE + SMALL.byteLength

    const opened = await open(client, session, {
      fileName: 'galeria.png',
      mimetype: 'image/png',
      size,
    })

    const parts = [
      {
        partNumber: 1,
        etag: await put(present(opened.parts[0], 'part 1').url, FULL_PART),
      },
      {
        partNumber: 2,
        etag: await put(present(opened.parts[1], 'part 2').url, SMALL),
      },
    ]

    const response = await client
      .post(`/storages/${opened.storage.id}/complete`)
      .cookies(session)
      .json({ parts })

    response.assertStatus(200)

    const metadata = await drive.use().getMetaData(opened.storage.path)

    assert.equal(metadata.contentLength, size)
    // The `uploadId` is zeroed: the conversation with the bucket is over, and keeping
    // its pointer would only keep alive an address that leads nowhere.
    assert.isNull(body(response).uploadId)
  })

  const LANGUAGES = [
    {
      header: 'pt-BR',
      size: (received: number, declared: number) =>
        `O arquivo enviado tem ${received} bytes, e ${declared} foram declarados.`,
    },
    {
      header: 'es',
      size: (received: number, declared: number) =>
        `El archivo enviado tiene ${received} bytes y se declararon ${declared}.`,
    },
    {
      header: 'en',
      size: (received: number, declared: number) =>
        `The uploaded file is ${received} bytes, but ${declared} were declared.`,
    },
  ]

  for (const language of LANGUAGES) {
    test(`when the language is ${language.header}, the per-field size error comes out in it, with the variables`, async ({
      client,
      assert,
    }) => {
      const session = await authenticateAsAdministrator(client)
      const declared = PART_SIZE + SMALL.byteLength
      const opened = await open(client, session, {
        fileName: 'capa.png',
        mimetype: 'image/png',
        size: declared,
      })
      const etag = await put(present(opened.parts[0], 'part 1').url, FULL_PART)

      const response = await client
        .post(`/storages/${opened.storage.id}/complete`)
        .cookies(session)
        .header('Accept-Language', language.header)
        .json({ parts: [{ partNumber: 1, etag }] })

      response.assertStatus(422)
      assert.equal(errorBody(response).code, 'STORAGE_SIZE_MISMATCH')
      assert.deepEqual(errorBody(response).errors, {
        size: language.size(PART_SIZE, declared),
      })
    })
  }

  test('when what was uploaded does not have the declared size, refuses with 422', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const declared = PART_SIZE + SMALL.byteLength

    // Declares two parts and confirms with one: it is the lie `complete` exists to catch,
    // since the bytes do not pass through the application.
    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: declared,
    })
    const etag = await put(present(opened.parts[0], 'part 1').url, FULL_PART)

    const response = await client
      .post(`/storages/${opened.storage.id}/complete`)
      .cookies(session)
      .json({ parts: [{ partNumber: 1, etag }] })

    response.assertStatus(422)
    assert.equal(errorBody(response).code, 'STORAGE_SIZE_MISMATCH')

    // Refused is refused: neither the row nor the binary survives, and the record
    // never reaches `UPLOADED`.
    assert.isNull(await Storage.find(opened.storage.id))
    assert.isFalse(await drive.use().exists(opened.storage.path))
  })

  test('when the confirmation happens twice, returns the same record', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    const again = await client
      .post(`/storages/${storage.id}/complete`)
      .cookies(session)
      .json({})

    again.assertStatus(200)
    assert.equal(body(again).id, storage.id)
    assert.equal(body(again).status, 'UPLOADED')
  })

  test('when a .png has the bytes of an SVG, refuses it in complete with 422 and deletes the object', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    )

    // The type is declared PNG and the PUT carries the signed `Content-Type`: the bucket has
    // no way to tell, since only the bytes betray the file.
    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: svg.byteLength,
    })

    await put(present(opened.parts[0], 'part 1').url, svg)
    assert.isTrue(await drive.use().exists(opened.storage.path))

    const response = await client
      .post(`/storages/${opened.storage.id}/complete`)
      .cookies(session)
      .json({})

    response.assertStatus(422)
    assert.equal(errorBody(response).code, 'STORAGE_CONTENT_MISMATCH')
    assert.isNull(await Storage.find(opened.storage.id))
    assert.isFalse(await drive.use().exists(opened.storage.path))
  })

  test('when reading the stored object without a signature, the bucket answers 403', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    const anonymous = await fetch(
      `${env.get('STORAGE_ENDPOINT')}/${bucket}/${storage.path}`,
    )

    assert.equal(anonymous.status, 403)
  })
})
