import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { TRASHED_MODE, left, right, type Either } from '@aporta/shared'

import Translation from '#core/translation'
import type { IdentifierPayload } from '#core/validator'
import type Storage from '#domain/storage/storage.entity'
import HTTPException from '#exceptions/http.exception'
import StorageRepository, {
  type StorageReference,
} from '#repositories/storage/storage.repository'
import ClockContract from '#services/clock/clock.contract'
import MultipartContract from '#services/multipart/multipart.contract'
import StorageContract from '#services/storage/storage.contract'

type Payload = IdentifierPayload
type Response = Either<HTTPException, null>

/**
 * Deletes an orphan file: the binary in the bucket and the row in `storages`.
 *
 * It exists to close the hole the upload opens. `POST /storages` registers the
 * file **before** the form is saved (it is what avoids a payload that
 * references a file that failed to upload), so every attachment chosen and
 * later removed from the screen would stay in the bucket forever.
 *
 * It serves both states. `PENDING` is an upload in progress, and deleting it is
 * **cancelling**: the multipart is aborted, and that is what makes the parts already sent
 * disappear. Without the abort they stay dangling forever - they do not show up in the
 * object listing, and keep being billed. `UPLOADED` is the finished
 * file, and there the reference rule below applies.
 *
 * **It only deletes what nobody uses.** `storages` is a neutral, shared record
 * - the file does not belong to the form that sent it -, so ownership does not
 * serve as authorization: whoever knew a uuid would pierce the cover of someone else's
 * news item. Referenced is `409`, and the message says where.
 */
@inject()
export default class StorageFileDeleteUseCase {
  constructor(
    private readonly files: StorageRepository,
    private readonly storage: StorageContract,
    private readonly multipart: MultipartContract,
    private readonly clock: ClockContract,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const storage = await this.files.findById(payload.id, TRASHED_MODE.WITH)

      if (!storage)
        return left(
          HTTPException.NotFound(
            Translation.t('errors.STORAGE_NOT_FOUND'),
            'STORAGE_NOT_FOUND',
          ),
        )

      // Cancelling an already cancelled upload again is success, not `404`: the client
      // repeats the `DELETE` when the first response is lost on the network, and has no
      // way of knowing it arrived. Only the cancelled `PENDING` leaves the row
      // with `deletedAt`; the `UPLOADED` one vanishes for good.
      if (storage.snapshot().deletedAt) return right(null)

      if (!storage.isUploaded()) return this.#cancel(storage)

      const references = await this.files.references(storage.id)

      if (references.length > 0)
        return left(
          HTTPException.Conflict(
            Translation.t('errors.STORAGE_IN_USE'),
            'STORAGE_IN_USE',
            {
              id: Translation.t('fields.STORAGE_IN_USE', {
                references: references
                  .map((reference) => this.#label(reference))
                  .join(', '),
              }),
            },
          ),
        )

      // Binary and then row: if the bucket fails, the row stays and the file
      // remains servable, instead of a broken `url` on screen.
      const discarded = await this.storage.discard(storage.snapshot().path)

      if (discarded.isLeft()) return left(this.#failure(discarded.value.cause))

      await this.files.delete(storage)

      return right(null)
    } catch (error) {
      return left(this.#failure(error))
    }
  }

  /** Logs the cause, which never reaches the client, and answers the `500`. */
  #failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[storage/files > delete][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.STORAGE_FILE_DELETE_ERROR'),
      'STORAGE_FILE_DELETE_ERROR',
    )
  }

  /** The place where the file is used, in the language of the request. */
  #label(reference: StorageReference): string {
    return {
      USER_AVATAR: Translation.t('references.USER_AVATAR'),
    }[reference]
  }

  /**
   * Cancels an upload in progress.
   *
   * It does not go through the reference rule because a `PENDING` cannot be
   * referenced: `allUploaded` refuses to attach what is not `UPLOADED`.
   *
   * The final object does not exist yet - the parts live under the `uploadId`, and it is the
   * abort that discards them. In a single-part upload there is no abort, and what
   * may exist is the whole object, when the `PUT` managed to complete before the
   * cancellation; deleting it may find nothing, and finding nothing is the
   * common case.
   */
  async #cancel(storage: Storage): Promise<Response> {
    const { path, uploadId } = storage.snapshot()

    if (uploadId) {
      const aborted = await this.multipart.abort(path, uploadId)

      if (aborted.isLeft()) return left(this.#failure(aborted.value.cause))
    }

    if (!uploadId) {
      // An object that is not there is success (`StorageContract.discard`); only a bucket
      // failure stops the cancellation.
      const discarded = await this.storage.discard(path)

      if (discarded.isLeft()) return left(this.#failure(discarded.value.cause))
    }

    // The row stays, marked, so the repeated `DELETE` answers the same. Whoever
    // deletes it for good is `node ace storages:prune`.
    const cancelled = storage.cancel(this.clock.now())
    if (cancelled.isRight()) await this.files.save(cancelled.value)

    return right(null)
  }
}
