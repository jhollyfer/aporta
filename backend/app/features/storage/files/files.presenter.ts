import type { StorageFileShowResponse } from '@aporta/shared'

import { WireDate } from '#core/response'
import type { OpenedStorageFile } from '#features/storage/_shared.upload'
import type { StorageRecord } from '#repositories/storage/storage.repository'

/**
 * The file as the panel reads it (`_standards/architecture.md` §10), field by
 * field, by allowlist.
 */
export default class StorageFilePresenter {
  /**
   * The detail, the listing, the resume and the confirmation. Comes out without `url`: signing is
   * bucket I/O, and whoever signs is the use-case (`StorageContract.signFile`).
   */
  static show(record: StorageRecord): StorageFileShowResponse {
    return {
      ...StorageFilePresenter.opened(record),
      deletedAt: WireDate.isoOrNull(record.storage.snapshot().deletedAt),
    }
  }

  /** The upload opening: the row that was just born `PENDING`. */
  static opened(record: StorageRecord): OpenedStorageFile {
    const storage = record.storage.snapshot()

    return {
      id: storage.id,
      filename: storage.filename,
      originalName: storage.originalName,
      mimetype: storage.mimetype,
      size: storage.size,
      path: storage.path,
      status: storage.status,
      uploadId: storage.uploadId,
      partSize: storage.partSize,
      createdAt: WireDate.isoOrNull(record.createdAt),
      updatedAt: WireDate.isoOrNull(record.updatedAt),
    }
  }
}
