import { TRASHED_MODE, left, right, type Either } from '@aporta/shared'

import type StorageRepository from '#repositories/storage/storage.repository'
import type StorageContract from '#services/storage/storage.contract'
import type StorageFailure from '#services/storage/storage.errors'

/** What a sweep did: the files whose binary and row are gone, and the ones still in use. */
export type StorageOrphansSwept = {
  readonly removed: ReadonlyArray<string>
  readonly kept: ReadonlyArray<string>
}

/**
 * Drops the bucket object and the `storages` row of the files that **nothing references any more**
 * (`_standards/backend.md` §4.9: logic two features need goes up to `features/_shared.<theme>.ts`;
 * a feature never imports another one). The next actions call it right after they let go of a
 * file: removing a photo from a listing and deleting a listing for good.
 *
 * The rule is the one `StorageFileDeleteUseCase` applies: a file is deleted only when
 * `StorageRepository.references` is empty, so a picture two ads share (the demo seed reuses
 * `demo/listings/*.jpg` across ads) survives while any of them still points at it. Call it
 * **after** the reference is gone (the photo row deleted), never before: the check reads the
 * database as it stands.
 *
 * Like `ListingPhotoUrls`, a class of `static` only that keeps no state: the repository and the
 * bucket contract come in as arguments, because injecting them here would turn a helper into a
 * service. Binary first and then row, as the delete use-case does: if the bucket fails, the row
 * stays and `storages:prune` or a repeat of the call can finish it, instead of a row pointing at
 * a missing object. A `PENDING` or already gone file is `kept`: an upload in progress is not an
 * orphan, it is the upload's own to cancel.
 */
export default class StorageOrphans {
  static async sweep(
    ids: ReadonlyArray<string>,
    storages: StorageRepository,
    bucket: StorageContract,
  ): Promise<Either<StorageFailure, StorageOrphansSwept>> {
    const removed: string[] = []
    const kept: string[] = []

    for (const id of new Set(ids)) {
      const storage = await storages.findById(id, TRASHED_MODE.WITH)

      if (!storage?.isUploaded()) {
        kept.push(id)
        continue
      }

      const references = await storages.references(id)

      if (references.length > 0) {
        kept.push(id)
        continue
      }

      const discarded = await bucket.discard(storage.snapshot().path)

      if (discarded.isLeft()) return left(discarded.value)

      await storages.delete(storage)
      removed.push(id)
    }

    return right({ removed, kept })
  }
}
