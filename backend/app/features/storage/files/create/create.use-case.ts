import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Actor,
  type Either,
  type Merge,
} from '@aporta/shared'

import Translation from '#core/translation'
import Storage from '#domain/storage/storage.entity'
import HTTPException from '#exceptions/http.exception'
import {
  countParts,
  partsToSign,
  pendingParts,
  type StorageUpload,
} from '#features/storage/_shared.upload'
import StorageFilePresenter from '#features/storage/files/files.presenter'
import StorageRepository from '#repositories/storage/storage.repository'
import IdGeneratorContract from '#services/id-generator/id-generator.contract'
import MultipartContract, {
  PART_SIZE,
  type PresignedPart,
} from '#services/multipart/multipart.contract'
import StorageContract from '#services/storage/storage.contract'
import type { StorageFileCreatePayload } from '#validators/storage/files.validator'

type Payload = Merge<StorageFileCreatePayload, { readonly actor: Actor }>

type Response = Either<HTTPException, StorageUpload>

/**
 * Opens an upload: registers the file as `PENDING` and returns where to upload it.
 *
 * **It receives no bytes**. The binary goes from the browser straight to the bucket,
 * via signed URL, and never crosses this application. It is not a style
 * preference: a large file in an HTTP body bumps into the proxy limit before
 * reaching here, occupies the whole application for the duration of the upload, and cannot
 * be resumed when the connection drops midway.
 *
 * Type and size are **declared** by the client and refused in the validator before
 * any signing - a forbidden file gets no URL, so it never reaches the
 * bucket. That the declared matches the truth is what `POST /storages/:id/complete`
 * checks, against the real object.
 *
 * A file smaller than one part does not become a multipart: it gets a single URL, null `uploadId`
 * and a direct `PUT`. `UploadId`, `ETag` collection and two-step confirmation
 * for a 40 KB avatar would be ceremony with no function.
 *
 * The file is born with an owner, the `actor` that opened the upload (there is no anonymous
 * upload, `_standards/backend.md` §5.4). Whoever attaches it keeps the id.
 */
@inject()
export default class StorageFileCreateUseCase {
  constructor(
    private readonly files: StorageRepository,
    private readonly storage: StorageContract,
    private readonly multipart: MultipartContract,
    private readonly ids: IdGeneratorContract,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    const key = this.storage.key(payload.mimetype)
    const totalParts = countParts(payload.size, PART_SIZE)

    let uploadId: string | null = null

    try {
      let parts: Array<PresignedPart> = []

      if (totalParts <= 1) {
        const single = await this.multipart.signSingle(
          key,
          payload.mimetype,
          payload.size,
        )

        if (single.isLeft()) return left(this.#failure(single.value.cause))

        parts = [{ partNumber: 1, url: single.value }]
      }

      if (totalParts > 1) {
        const initiated = await this.multipart.initiate(key, payload.mimetype)

        if (initiated.isLeft())
          return left(this.#failure(initiated.value.cause))

        uploadId = initiated.value

        const signed = await this.multipart.signParts(
          key,
          uploadId,
          partsToSign(payload.size, PART_SIZE, pendingParts(totalParts, [])),
        )

        if (signed.isLeft()) {
          await this.#abortQuietly(key, uploadId)

          return left(this.#failure(signed.value.cause))
        }

        parts = signed.value
      }

      const record = await this.files.save(
        Storage.create({
          id: this.ids.next(),
          key,
          originalName: payload.fileName,
          mimetype: payload.mimetype,
          size: payload.size,
          partSize: PART_SIZE,
          uploadId,
          ownerId: payload.actor.id,
        }),
      )

      return right({
        storage: StorageFilePresenter.opened(record),
        uploadId,
        partSize: PART_SIZE,
        totalParts,
        parts,
        uploaded: [],
      })
    } catch (error) {
      // The multipart may have been opened before the row failed. Without this
      // abort it stays dangling in the bucket forever: orphan parts do not
      // show up in the object listing and keep being billed.
      if (uploadId) await this.#abortQuietly(key, uploadId)

      return left(this.#failure(error))
    }
  }

  /** Logs the cause, which never reaches the client, and answers the `500`. */
  #failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[storage/files > create][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.STORAGE_FILE_CREATE_ERROR'),
      'STORAGE_FILE_CREATE_ERROR',
    )
  }

  /**
   * Aborts without letting the abort failure mask the original failure - whoever calls
   * is already on the error path, and what matters to report is the first.
   */
  async #abortQuietly(key: string, uploadId: string): Promise<void> {
    try {
      const aborted = await this.multipart.abort(key, uploadId)

      if (aborted.isLeft())
        logger.error(
          { err: aborted.value.cause },
          '[storage/files > create][abort][error]',
        )
    } catch (error) {
      logger.error({ err: error }, '[storage/files > create][abort][error]')
    }
  }
}
