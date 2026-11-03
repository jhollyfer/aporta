import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Either,
  type Merge,
  type StorageFileShowResponse,
} from '@aporta/shared'

import Translation from '#core/translation'
import type { IdentifierPayload } from '#core/validator'
import FileSignature from '#domain/shared/file-signature.value-object'
import type Storage from '#domain/storage/storage.entity'
import HTTPException from '#exceptions/http.exception'
import StorageFilePresenter from '#features/storage/files/files.presenter'
import StorageRepository from '#repositories/storage/storage.repository'
import MultipartContract from '#services/multipart/multipart.contract'
import StorageContract from '#services/storage/storage.contract'
import type { StorageFileCompletePayload } from '#validators/storage/files.validator'

type Payload = Merge<IdentifierPayload, StorageFileCompletePayload>
type Response = Either<HTTPException, StorageFileShowResponse>

/**
 * Closes the upload: reassembles the parts in the bucket and marks the row as `UPLOADED`.
 *
 * This is where "declared" becomes "checked". `POST /storages` believed the
 * size the client reported - it had no way not to, since the
 * bytes do not pass through here -, and this endpoint compares what
 * **actually** got uploaded with what was promised. If it diverged: the object is deleted, the
 * row dies along with it, and the response is `422`.
 *
 * The type and the size of each `PUT` are pinned in the URL signature
 * (`_standards/backend.md` §5.4), so the bucket refuses a request whose `Content-Type` or
 * `Content-Length` does not match what was signed. What the signature cannot prove is the
 * **sum** of the parts of a multipart - each part has its own URL -, and that is why the
 * size is what gets checked here.
 *
 * The same goes for the **type**: the `Content-Type` of the stored object and its first bytes
 * (magic bytes) are compared with the declared `mimetype` (`_standards/backend.md` §5.4), so a
 * `.png` whose bytes are an SVG is refused - object deleted, row dead, `422` - instead of
 * being served from the storage origin.
 *
 * Calling twice is safe. A client that lost the response to a network drop
 * resends the confirmation, and the second one returns the same record instead of
 * an "upload already closed" error that would help nobody.
 */
@inject()
export default class StorageFileCompleteUseCase {
  constructor(
    private readonly files: StorageRepository,
    private readonly storage: StorageContract,
    private readonly multipart: MultipartContract,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const found = await this.files.findRecord(payload.id)

      if (!found)
        return left(
          HTTPException.NotFound(
            Translation.t('errors.STORAGE_NOT_FOUND'),
            'STORAGE_NOT_FOUND',
          ),
        )

      if (found.storage.isUploaded())
        return right(
          await this.storage.signFile(StorageFilePresenter.show(found)),
        )

      const storage = found.storage.snapshot()

      if (storage.uploadId) {
        const closed = await this.multipart.complete(
          storage.path,
          storage.uploadId,
          payload.parts ?? [],
        )

        if (closed.isLeft()) return left(this.#failure(closed.value.cause))
      }

      const stat = await this.storage.metadata(storage.path)

      if (stat.isLeft()) return left(this.#failure(stat.value.cause))

      const metadata = stat.value

      // The object is not in the bucket: the client confirmed before the `PUT` finished (or the
      // `PUT` failed). That is the client's to fix, not a server fault: `422`, and the row stays
      // `PENDING` so the same confirmation works once the bytes are there.
      if (metadata === null) return left(this.#missing())

      const confirmed = found.storage.confirm(metadata.contentLength)

      if (confirmed.isLeft()) {
        await this.#discard(found.storage)

        return left(
          HTTPException.UnprocessableEntity(
            Translation.t('errors.STORAGE_SIZE_MISMATCH'),
            'STORAGE_SIZE_MISMATCH',
            {
              size: Translation.t('fields.STORAGE_SIZE_MISMATCH', {
                received: confirmed.value.received,
                declared: confirmed.value.declared,
              }),
            },
          ),
        )
      }

      // The size is the declared one; what remains is whether the bytes are of the declared
      // type. A `Range` read of the first bytes is enough, the binary does not come up here.
      const head = await this.storage.readHead(
        storage.path,
        FileSignature.LENGTH,
      )

      if (head.isLeft()) return left(this.#failure(head.value.cause))

      if (head.value === null) return left(this.#missing())

      const verified = found.storage.verifyContent({
        contentType: metadata.contentType,
        head: head.value,
      })

      if (verified.isLeft()) {
        await this.#discard(found.storage)

        return left(
          HTTPException.UnprocessableEntity(
            Translation.t('errors.STORAGE_CONTENT_MISMATCH'),
            'STORAGE_CONTENT_MISMATCH',
            {
              mimetype: Translation.t('fields.STORAGE_CONTENT_MISMATCH', {
                declared: verified.value.declared,
              }),
            },
          ),
        )
      }

      const record = await this.files.save(confirmed.value)

      return right(
        await this.storage.signFile(StorageFilePresenter.show(record)),
      )
    } catch (error) {
      return left(this.#failure(error))
    }
  }

  /** The object is not in the bucket yet: nothing to confirm, and the client can try again. */
  #missing(): HTTPException {
    return HTTPException.UnprocessableEntity(
      Translation.t('errors.STORAGE_UPLOAD_MISSING'),
      'STORAGE_UPLOAD_MISSING',
    )
  }

  /** Logs the cause, which never reaches the client, and answers the `500`. */
  #failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[storage/files > complete][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.STORAGE_FILE_COMPLETE_ERROR'),
      'STORAGE_FILE_COMPLETE_ERROR',
    )
  }

  /**
   * Deletes what was uploaded wrong, binary and row, in this order.
   *
   * The row dies along because it no longer describes anything: a `PENDING` whose
   * object was deleted can never be confirmed, and would stay forever
   * occupying an id that someone could try to attach.
   */
  async #discard(file: Storage): Promise<void> {
    try {
      const discarded = await this.storage.discard(file.snapshot().path)

      if (discarded.isLeft()) {
        logger.error(
          { err: discarded.value.cause },
          '[storage/files > complete][discard][error]',
        )

        return
      }

      await this.files.delete(file)
    } catch (error) {
      logger.error({ err: error }, '[storage/files > complete][discard][error]')
    }
  }
}
