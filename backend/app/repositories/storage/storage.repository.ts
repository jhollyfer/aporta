import type {
  Merge,
  Paginated,
  STORAGE_SORT_COLUMNS,
  StorageMimetype,
  TrashedMode,
  UploadStatus,
} from '@aporta/shared'

import type { PageCriteria } from '#core/page-criteria'
import type Storage from '#domain/storage/storage.entity'

/** The file as it is stored: the entity and the time stamps. */
/**
 * Every place a file can be in use, as a stable identifier (the label is the
 * use-case's, translated from `references.<id>`, `i18n.md` §3).
 */
export const STORAGE_REFERENCE = {
  USER_AVATAR: 'USER_AVATAR',
} as const

export type StorageReference =
  (typeof STORAGE_REFERENCE)[keyof typeof STORAGE_REFERENCE]

export type StorageRecord = {
  readonly storage: Storage
  readonly createdAt: Date | null
  readonly updatedAt: Date | null
}

export type StorageSortColumn = (typeof STORAGE_SORT_COLUMNS)[number]

/** The panel library: status, type and search in name, key and type. */
export type StorageListCriteria = Merge<
  PageCriteria<StorageSortColumn>,
  {
    readonly status?: UploadStatus
    readonly mimetype?: StorageMimetype
  }
>

/**
 * The file persistence, by intent (`_standards/domain.md` §5.1), in the
 * house repository mold. The binary belongs to `StorageContract`; here only the
 * `storages` row and the question "who uses this file"
 * (`_standards/backend.md` §4.9).
 */
export default abstract class StorageRepository {
  /** The file for a write. Without `trashed`, only what has not been cancelled. */
  abstract findById(id: string, trashed?: TrashedMode): Promise<Storage | null>

  /** The live file, with the stamps: the detail, the resume and the confirmation. */
  abstract findRecord(id: string): Promise<StorageRecord | null>

  abstract paginate(
    criteria: StorageListCriteria,
  ): Promise<Paginated<StorageRecord>>

  /**
   * Where the file is used, as stable identifiers; the use-case translates them
   * (`references.<id>`). Empty means orphan, and an orphan is the
   * only one that gets deleted.
   */
  abstract references(id: string): Promise<StorageReference[]>

  /**
   * Whether every given id (without repetition) belongs to a live and already `UPLOADED` file.
   * `PENDING` counts as nonexistent on purpose: the row is born before the
   * binary is intact, and attaching it would publish a half-uploaded cover.
   * An empty list is true: there is nothing to be missing.
   */
  abstract allUploaded(ids: ReadonlyArray<string>): Promise<boolean>

  /**
   * The `PENDING` uploads created before `before`, from oldest to
   * newest, including the already cancelled ones: the `storages:prune` sweep deletes
   * what nobody will complete anymore.
   */
  abstract findAbandoned(before: Date): Promise<StorageRecord[]>

  /** Writes and returns it as it ended up in the database. */
  abstract save(storage: Storage): Promise<StorageRecord>

  /**
   * Hands every file of the account `from` over to the account `to`. The column is
   * `NOT NULL ... ON DELETE RESTRICT`, so an account with files cannot be deleted until its
   * files have another owner; the files stay (a listing photo is one of them).
   */
  abstract transferOwnership(from: string, to: string): Promise<void>

  /** Deletes the row for good. The binary belongs to `StorageContract`, beforehand. */
  abstract delete(storage: Storage): Promise<void>
}
