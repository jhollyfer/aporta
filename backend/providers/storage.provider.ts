import type { ApplicationService } from '@adonisjs/core/types'
import { S3Client } from '@aws-sdk/client-s3'

import { clientConfig } from '#config/drive'
import MultipartContract from '#services/multipart/multipart.contract'
import StorageContract from '#services/storage/storage.contract'

/**
 * Registers the S3 client in the container.
 *
 * Here and not inside `MultipartService` because a service that builds its own
 * dependency has no way to receive it from elsewhere: a test that
 * wanted to point to another bucket, count calls or simulate a storage failure
 * would have to touch an environment variable of the whole process. With the
 * bind, it is one line of `container.swap(S3Client, …)`.
 *
 * `singleton` and not `bind`: the client holds the HTTP connection pool, and one per
 * request would throw away the keep-alive on every upload.
 */
export default class StorageProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(S3Client, () => new S3Client(clientConfig))

    // The composition root of the external I/O contracts (`_standards/solid.md` §2):
    // the use-case asks for the contract, and it is only here that it becomes the S3 implementation.
    // Dynamic import: the implementation reads `drive` and `config`, which only become
    // ready after boot, and `register` runs before it.
    this.app.container.bind(StorageContract, async (resolver) => {
      const { default: StorageService } =
        await import('#services/storage/storage.service')
      return resolver.make(StorageService)
    })

    this.app.container.bind(MultipartContract, async (resolver) => {
      const { default: MultipartService } =
        await import('#services/multipart/multipart.service')
      return resolver.make(MultipartService)
    })
  }

  async shutdown() {
    const client = await this.app.container.make(S3Client)

    client.destroy()
  }
}
