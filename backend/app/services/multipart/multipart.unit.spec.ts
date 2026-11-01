import { createServer } from 'node:http'
import type { Socket } from 'node:net'

import { S3Client } from '@aws-sdk/client-s3'
import { test } from '@japa/runner'

import { clientConfig } from '#config/drive'
import MultipartService from '#services/multipart/multipart.service'
import { rightOf } from '#tests/response-fixtures'

/**
 * The signing of the part URLs, which is local (the presigner does no network): what
 * comes out is the contract with the browser client. The protocol against the bucket
 * (initiate, listParts, complete, abort) belongs to `multipart.e2e.spec.ts`. The second group
 * is the time ceiling of the client.
 */
test.group('services > multipart (unit)', () => {
  function service() {
    return new MultipartService(new S3Client(clientConfig))
  }

  test('when signing parts, returns one url per requested part number, in order', async ({
    assert,
  }) => {
    const parts = rightOf(
      await service().signParts('chave.png', 'upload-1', [
        { partNumber: 3, contentLength: 10 },
        { partNumber: 5, contentLength: 4 },
      ]),
    )

    assert.deepEqual(
      parts.map((part) => part.partNumber),
      [3, 5],
    )
    for (const part of parts) {
      assert.include(part.url, 'chave.png')
      assert.include(part.url, 'uploadId=upload-1')
      assert.include(part.url, `partNumber=${part.partNumber}`)
    }
  })

  test('when signing a single upload, returns a PUT url without uploadId', async ({
    assert,
  }) => {
    const url = rightOf(
      await service().signSingle('capa.png', 'image/png', 1024),
    )

    assert.include(url, 'capa.png')
    assert.include(url, 'X-Amz-Signature')
    assert.notInclude(url, 'uploadId')
  })

  test('when signing a single upload, pins content-type and content-length in the signature', async ({
    assert,
  }) => {
    const url = rightOf(
      await service().signSingle('capa.png', 'image/png', 1024),
    )

    const signed = new URL(url).searchParams.get('X-Amz-SignedHeaders') ?? ''

    assert.include(signed.split(';'), 'content-type')
    assert.include(signed.split(';'), 'content-length')
  })

  test('when signing a part, pins content-length and content-type in the signature', async ({
    assert,
  }) => {
    const [part] = rightOf(
      await service().signParts('chave.png', 'upload-1', [
        { partNumber: 1, contentLength: 10 },
      ]),
    )

    const signed =
      new URL(part?.url ?? '').searchParams.get('X-Amz-SignedHeaders') ?? ''

    assert.include(signed.split(';'), 'content-length')
    assert.include(signed.split(';'), 'content-type')
  })
})

/**
 * The ceiling of time on the bucket (`_standards/backend.md` §5.3): the SDK default is no
 * timeout, so a hung bucket would hold the request until the process fell over. Here the
 * bucket is a server that accepts the connection and never answers.
 */
test.group('services > multipart > timeout (unit)', () => {
  test('when the client config is built, it sets a connection timeout and a request timeout that throws', ({
    assert,
  }) => {
    const handler = clientConfig.requestHandler

    if (typeof handler !== 'object' || handler === null)
      return assert.fail('requestHandler must be a plain options object')

    if (!('requestTimeout' in handler && 'connectionTimeout' in handler))
      return assert.fail('requestHandler must set both timeouts')

    assert.isAbove(Number(handler.requestTimeout), 0)
    assert.isAbove(Number(handler.connectionTimeout), 0)
    // Without it the SDK only warns when the request timeout is exceeded.
    assert.isTrue(
      'throwOnRequestTimeout' in handler &&
        handler.throwOnRequestTimeout === true,
    )
  })

  test('when the bucket never answers, listParts gives up with a left and does not throw', async ({
    assert,
  }) => {
    const sockets = new Set<Socket>()
    const server = createServer(() => {
      // never answers
    })
    server.on('connection', (socket) => sockets.add(socket))
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))

    try {
      const address = server.address()

      if (address === null || typeof address === 'string')
        return assert.fail('the server must listen on a TCP port')

      const service = new MultipartService(
        new S3Client({
          ...clientConfig,
          endpoint: `http://127.0.0.1:${address.port}`,
          maxAttempts: 1,
          requestHandler: {
            connectionTimeout: 200,
            requestTimeout: 200,
            throwOnRequestTimeout: true,
          },
        }),
      )

      const result = await service.listParts('chave.png', 'upload-1')

      assert.isTrue(result.isLeft())
      if (result.isLeft()) assert.equal(result.value.code, 'MULTIPART_FAILURE')
    } finally {
      for (const socket of sockets) socket.destroy()
      server.close()
    }
  })
})
