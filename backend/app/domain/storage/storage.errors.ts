/**
 * The file domain facts: what the entity refuses, with no HTTP status or
 * screen text (`_standards/domain.md` §2).
 */

/** What actually got uploaded to the bucket does not have the size declared when opening the upload. */
export type StorageSizeMismatch = {
  readonly code: 'STORAGE_SIZE_MISMATCH'
  readonly declared: number
  readonly received: number
}

/**
 * The bytes (or the `Content-Type`) of what got uploaded are not those of the type declared when
 * opening the upload: a `.png` whose bytes are an SVG. `detected` is the accepted type the bytes
 * belong to, or `null` when they belong to none.
 */
export type StorageContentMismatch = {
  readonly code: 'STORAGE_CONTENT_MISMATCH'
  readonly declared: string
  readonly detected: string | null
}

/** Cancelling what is no longer in progress (confirmed or already cancelled). */
export type StorageNotPending = { readonly code: 'STORAGE_NOT_PENDING' }

/**
 * A file that a record points at does not exist, was removed or is still `PENDING`. `field` is
 * the payload field that carried its id, so the answer can point at it.
 */
export type StorageNotFound = {
  readonly code: 'STORAGE_NOT_FOUND'
  readonly field: string
}

export type StorageError =
  | StorageSizeMismatch
  | StorageContentMismatch
  | StorageNotPending
  | StorageNotFound
