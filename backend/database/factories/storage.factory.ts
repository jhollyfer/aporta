import factory from '@adonisjs/lucid/factories'
import { UPLOAD_STATUS } from '@aporta/shared'

import Storage from '#models/storage'

/**
 * File record. The factory writes only the table row: nothing goes to the
 * bucket.
 *
 * That is enough for everything the test needs - `cover_id`, `audio_id`,
 * `avatar_id` and the gallery pivots - because the response `url` is derived
 * on read (`StorageContract.signFile`) from `path`. The URL comes out
 * filled in the JSON; opening the URL gives 404, and that is expected.
 *
 * `path` equals `filename`, with no directory at all: it is exactly the key the
 * upload writes to the bucket.
 *
 * Every file has an owner (`owner_id` is `NOT NULL`), and the factory does not make one: the
 * model has no relation to `users` (it would close the cycle `storage` <-> `user`). The test
 * passes `ownerId`, and `storageRecord()` creates an account when it is not given.
 *
 * It is born `UPLOADED` because it is the only state attachable to a resource - a
 * `PENDING` is an upload in progress, and no use-case accepts it.
 */
export const StorageFactory = factory
  .define(Storage, ({ faker }) => {
    const filename = `${faker.string.uuid()}.png`

    return {
      filename,
      originalName: 'capa.png',
      mimetype: 'image/png',
      size: 1024,
      path: filename,
      status: UPLOAD_STATUS.UPLOADED,
    }
  })
  .build()
