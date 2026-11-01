import { randomUUID } from 'node:crypto'

import app from '@adonisjs/core/services/app'
import drive from '@adonisjs/drive/services/main'
import { MULTIPART_PART_CONTENT_TYPE } from '@aporta/shared'
import { test } from '@japa/runner'

import type { PartToSign } from '#services/multipart/multipart.contract'
import MultipartService from '#services/multipart/multipart.service'
import { present, rightOf } from '#tests/response-fixtures'

/**
 * The multipart against the real bucket (the MinIO from `docker-compose.yml`).
 *
 * Against the real storage and not a double because the protocol is precisely
 * what is under test: the 5 MB minimum per part, the `ETag` that only comes in the header
 * of the response, the URL that expires and the `ListParts` that sees what was uploaded. A
 * double would answer whatever I programmed and would prove none of that.
 */

/**
 * S3 refuses a non-final part under 5 MB (`EntityTooSmall`), so the
 * first has exactly the minimum. The second is tiny on purpose: it is the
 * last, and for it there is no minimum.
 */
const FIRST_PART = new Uint8Array(5 * 1024 * 1024).fill(65)
const LAST_PART = new Uint8Array(1024).fill(66)

/** The part to sign: its number and the length of the body that will be sent. */
function sized(partNumber: number, body: Uint8Array): PartToSign {
  return { partNumber, contentLength: body.byteLength }
}

/** Sends a part to the signed URL and returns the `ETag` the bucket gave. */
async function put(url: string, body: Uint8Array): Promise<string> {
  const response = await fetch(url, {
    method: 'PUT',
    body,
    headers: { 'Content-Type': MULTIPART_PART_CONTENT_TYPE },
  })

  if (!response.ok) {
    throw new Error(`part PUT answered ${response.status}`)
  }

  const etag = response.headers.get('etag')

  if (!etag) {
    throw new Error('bucket returned no ETag - complete would be impossible')
  }

  return etag
}

test.group('services > multipart', () => {
  test('when the file is uploaded in parts, reassembles it and the final object has the sum of the sizes', async ({
    assert,
  }) => {
    const multipart = await app.container.make(MultipartService)
    const key = `test-${randomUUID()}.bin`

    const uploadId = rightOf(
      await multipart.initiate(key, 'application/octet-stream'),
    )
    const urls = rightOf(
      await multipart.signParts(key, uploadId, [
        sized(1, FIRST_PART),
        sized(2, LAST_PART),
      ]),
    )

    assert.lengthOf(urls, 2)
    assert.deepEqual(
      urls.map((part) => part.partNumber),
      [1, 2],
    )

    const parts = [
      {
        partNumber: 1,
        etag: await put(present(urls[0], 'part 1').url, FIRST_PART),
      },
      {
        partNumber: 2,
        etag: await put(present(urls[1], 'part 2').url, LAST_PART),
      },
    ]

    // Before complete, nothing exists at the final key: what the bucket has are the
    // parts, and that is what the resume sees.
    assert.isFalse(await drive.use().exists(key))

    const received = rightOf(await multipart.listParts(key, uploadId))

    assert.lengthOf(received, 2)
    assert.equal(present(received[0], 'part 1').size, FIRST_PART.byteLength)
    assert.equal(present(received[1], 'part 2').size, LAST_PART.byteLength)

    rightOf(await multipart.complete(key, uploadId, parts))

    const metadata = await drive.use().getMetaData(key)

    assert.equal(
      metadata.contentLength,
      FIRST_PART.byteLength + LAST_PART.byteLength,
    )

    await drive.use().delete(key)
  })

  test('when listing parts, sees only what was uploaded, and that is what the resume uses', async ({
    assert,
  }) => {
    const multipart = await app.container.make(MultipartService)
    const key = `test-${randomUUID()}.bin`

    const uploadId = rightOf(
      await multipart.initiate(key, 'application/octet-stream'),
    )
    const [firstUrl] = rightOf(
      await multipart.signParts(key, uploadId, [sized(1, FIRST_PART)]),
    )
    const first = present(firstUrl, 'the URL of part 1')

    await put(first.url, FIRST_PART)

    const received = rightOf(await multipart.listParts(key, uploadId))

    assert.deepEqual(
      received.map((part) => part.partNumber),
      [1],
    )

    rightOf(await multipart.abort(key, uploadId))
  })

  test('when the upload is aborted, discards the parts and nothing is left occupying the bucket', async ({
    assert,
  }) => {
    const multipart = await app.container.make(MultipartService)
    const key = `test-${randomUUID()}.bin`

    const uploadId = rightOf(
      await multipart.initiate(key, 'application/octet-stream'),
    )
    const [firstUrl] = rightOf(
      await multipart.signParts(key, uploadId, [sized(1, FIRST_PART)]),
    )
    const first = present(firstUrl, 'the URL of part 1')

    await put(first.url, FIRST_PART)
    rightOf(await multipart.abort(key, uploadId))

    // The upload ceased to exist: listing its parts now is an error, not an
    // empty list. It is the difference between "aborted" and "open with no parts".
    assert.isTrue((await multipart.listParts(key, uploadId)).isLeft())
    assert.isFalse(await drive.use().exists(key))
  })

  test('when the signed URL expires, stops working', async ({ assert }) => {
    const multipart = await app.container.make(MultipartService)
    const key = `test-${randomUUID()}.bin`

    const uploadId = rightOf(
      await multipart.initiate(key, 'application/octet-stream'),
    )
    const [expiringUrl] = rightOf(
      await multipart.signParts(key, uploadId, [sized(1, LAST_PART)], 1),
    )
    const expiring = present(expiringUrl, 'the expiring URL')

    await new Promise((resolve) => setTimeout(resolve, 1_500))

    const refused = await fetch(expiring.url, {
      method: 'PUT',
      body: LAST_PART,
      headers: { 'Content-Type': MULTIPART_PART_CONTENT_TYPE },
    })

    assert.equal(refused.status, 403)

    // And the upload stays open: a new URL uploads the same part. It is what
    // `GET /storages/:id/parts` does for whoever was offline for hours.
    const [renewedUrl] = rightOf(
      await multipart.signParts(key, uploadId, [sized(1, LAST_PART)]),
    )
    const renewed = present(renewedUrl, 'the renewed URL')

    await put(renewed.url, LAST_PART)

    assert.lengthOf(rightOf(await multipart.listParts(key, uploadId)), 1)

    rightOf(await multipart.abort(key, uploadId))
  })

  test('when the PUT of a single upload carries another Content-Type than the signed one, the bucket answers 403', async ({
    assert,
  }) => {
    const multipart = await app.container.make(MultipartService)
    const key = `test-${randomUUID()}.png`
    const body = new Uint8Array(1024).fill(66)

    const url = rightOf(
      await multipart.signSingle(key, 'image/png', body.byteLength),
    )

    const wrongType = await fetch(url, {
      method: 'PUT',
      body,
      headers: { 'Content-Type': 'image/svg+xml' },
    })

    assert.equal(wrongType.status, 403)
    assert.isFalse(await drive.use().exists(key))
  })

  test('when the PUT of a single upload carries another size than the signed one, the bucket answers 403', async ({
    assert,
  }) => {
    const multipart = await app.container.make(MultipartService)
    const key = `test-${randomUUID()}.png`
    const body = new Uint8Array(1024).fill(66)

    const url = rightOf(await multipart.signSingle(key, 'image/png', 512))

    const refused = await fetch(url, {
      method: 'PUT',
      body,
      headers: { 'Content-Type': 'image/png' },
    })

    assert.equal(refused.status, 403)
    assert.isFalse(await drive.use().exists(key))
  })

  test('when the PUT of a single upload matches the signed type and size, the bucket accepts it', async ({
    assert,
  }) => {
    const multipart = await app.container.make(MultipartService)
    const key = `test-${randomUUID()}.png`
    const body = new Uint8Array(1024).fill(66)

    const url = rightOf(
      await multipart.signSingle(key, 'image/png', body.byteLength),
    )

    const accepted = await fetch(url, {
      method: 'PUT',
      body,
      headers: { 'Content-Type': 'image/png' },
    })

    assert.equal(accepted.status, 200)
    await drive.use().delete(key)
  })

  test('when the PUT of a part carries another size than the signed one, the bucket answers 403', async ({
    assert,
  }) => {
    const multipart = await app.container.make(MultipartService)
    const key = `test-${randomUUID()}.bin`

    const uploadId = rightOf(
      await multipart.initiate(key, 'application/octet-stream'),
    )
    const [signed] = rightOf(
      await multipart.signParts(key, uploadId, [sized(1, LAST_PART)]),
    )

    const refused = await fetch(present(signed, 'part 1').url, {
      method: 'PUT',
      body: FIRST_PART,
      headers: { 'Content-Type': MULTIPART_PART_CONTENT_TYPE },
    })

    assert.equal(refused.status, 403)

    rightOf(await multipart.abort(key, uploadId))
  })
})
