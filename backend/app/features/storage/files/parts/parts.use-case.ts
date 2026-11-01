import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@aporta/shared'

import Translation from '#core/translation'
import type { IdentifierPayload } from '#core/validator'
import type Storage from '#domain/storage/storage.entity'
import HTTPException from '#exceptions/http.exception'
import {
  countParts,
  partsToSign,
  pendingParts,
  type StorageUpload,
} from '#features/storage/_shared.upload'
import StorageFilePresenter from '#features/storage/files/files.presenter'
import StorageRepository, {
  type StorageRecord,
} from '#repositories/storage/storage.repository'
import MultipartContract, {
  PART_SIZE,
  type PresignedPart,
  type UploadedPart,
} from '#services/multipart/multipart.contract'
import type MultipartFailure from '#services/multipart/multipart.errors'
import StorageContract from '#services/storage/storage.contract'
import type StorageFailure from '#services/storage/storage.errors'

type Payload = IdentifierPayload
type Response = Either<HTTPException, StorageUpload>

/**
 * Where to continue from: what the bucket has already received, and a new URL for what is missing.
 *
 * A single endpoint for two cases that are the same problem:
 *
 * - **resume.** The connection dropped at part 900 of a thousand. Without this, the only way out
 *   would be to start over from zero - and starting over from zero on a large file is what
 *   makes a bad network insurmountable instead of merely slow.
 * - **next batch.** URLs come out in batches (`PRESIGNED_BATCH`), because signing
 *   a thousand at once would be half a megabyte of JSON before the first byte went up.
 *   Whoever finished the batch asks for the next one here.
 *
 * Signing again is the point, not a side effect: a signed URL expires, and
 * an upload that lasted longer than the validity finds here a new address for the
 * same part. That is why the response re-signs instead of returning the
 * original URLs.
 */
@inject()
export default class StorageFilePartsUseCase {
  constructor(
    private readonly files: StorageRepository,
    private readonly storage: StorageContract,
    private readonly multipart: MultipartContract,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const record = await this.files.findRecord(payload.id)

      if (!record)
        return left(
          HTTPException.NotFound(
            Translation.t('errors.STORAGE_NOT_FOUND'),
            'STORAGE_NOT_FOUND',
          ),
        )

      const storage = record.storage.snapshot()
      const partSize = storage.partSize ?? PART_SIZE
      const totalParts = countParts(storage.size, partSize)

      // Already confirmed: nothing to upload. Return the same shape with empty
      // lists, and not an error, because the one asking is a resuming client -
      // it reads the `status` and stops, which is the right outcome.
      if (record.storage.isUploaded())
        return right(await this.#envelope(record, partSize, totalParts, [], []))

      const found = await this.#uploaded(record.storage)

      if (found.isLeft()) return left(this.#failure(found.value.cause))

      const uploaded = found.value
      const missing = pendingParts(
        totalParts,
        uploaded.map((part) => part.partNumber),
      )
      const signed = await this.#sign(record.storage, partSize, missing)

      if (signed.isLeft()) return left(this.#failure(signed.value.cause))

      const parts = signed.value

      return right(
        await this.#envelope(record, partSize, totalParts, parts, uploaded),
      )
    } catch (error) {
      return left(this.#failure(error))
    }
  }

  /** Logs the cause, which never reaches the client, and answers the `500`. */
  #failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[storage/files > parts][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.STORAGE_FILE_PARTS_ERROR'),
      'STORAGE_FILE_PARTS_ERROR',
    )
  }

  /**
   * What the bucket already has.
   *
   * In a multipart it is `ListParts`. In a single-part upload there are no parts to
   * list, and what answers the same question is the object itself existing: if the
   * `PUT` managed to complete, the file is there and only confirmation is missing.
   */
  async #uploaded(
    file: Storage,
  ): Promise<Either<MultipartFailure | StorageFailure, Array<UploadedPart>>> {
    const storage = file.snapshot()

    if (storage.uploadId)
      return this.multipart.listParts(storage.path, storage.uploadId)

    const metadata = await this.storage.metadata(storage.path)

    if (metadata.isLeft()) return left(metadata.value)

    // The object does not exist in the bucket yet: nothing sent, nothing to resume.
    if (metadata.value === null) return right([])

    return right([
      {
        partNumber: 1,
        size: metadata.value.contentLength,
        etag: metadata.value.etag ?? '',
      },
    ])
  }

  /** A new URL for each missing part - the old ones may have expired. */
  async #sign(
    file: Storage,
    partSize: number,
    missing: Array<number>,
  ): Promise<Either<MultipartFailure, Array<PresignedPart>>> {
    if (missing.length === 0) return right([])

    const storage = file.snapshot()

    if (storage.uploadId) {
      return this.multipart.signParts(
        storage.path,
        storage.uploadId,
        partsToSign(storage.size, partSize, missing),
      )
    }

    const single = await this.multipart.signSingle(
      storage.path,
      storage.mimetype,
      storage.size,
    )

    if (single.isLeft()) return left(single.value)

    return right([{ partNumber: 1, url: single.value }])
  }

  async #envelope(
    record: StorageRecord,
    partSize: number,
    totalParts: number,
    parts: Array<PresignedPart>,
    uploaded: Array<UploadedPart>,
  ): Promise<StorageUpload> {
    return {
      storage: await this.storage.signFile(StorageFilePresenter.show(record)),
      uploadId: record.storage.snapshot().uploadId,
      partSize,
      totalParts,
      parts,
      uploaded,
    }
  }
}
