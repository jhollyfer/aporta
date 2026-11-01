import {
  STORAGE_SORT_COLUMNS,
  UPLOAD_STATUSES,
  STORAGE_MIMETYPES,
} from '@aporta/shared'

import { fileName, paginationFields, sortFields, vine } from '#core/validator'
import type { Infer } from '#core/validator'
import env from '#start/env'

/**
 * The per-file ceiling, in bytes. It comes from the environment and has no default: without the
 * variable the application does not even boot (`start/env.ts`). The `size` column is
 * `bigint` precisely so as not to impose here a ceiling the operator did not ask for.
 */
export const UPLOAD_MAX_SIZE = env.get('UPLOAD_MAX_SIZE')

/**
 * What `POST /storages` receives: metadata, never bytes.
 *
 * The binary goes from the browser straight to the bucket, so type and size
 * are **declared** here and checked against the real object in
 * `POST /storages/:id/complete`. Refusing before signing is what prevents a
 * forbidden file from reaching the bucket; checking afterwards is what prevents the
 * declared one from having been a lie.
 */
export const StorageFileCreateValidator = vine.create({
  fileName: fileName(),
  mimetype: vine.enum(STORAGE_MIMETYPES),
  size: vine.number().min(1).max(UPLOAD_MAX_SIZE).withoutDecimals(),
})

export type StorageFileCreatePayload = Infer<typeof StorageFileCreateValidator>

/**
 * What `POST /storages/:id/complete` receives: the `ETag` of each part sent.
 *
 * Empty - or absent - is a single-part upload, which has no part to
 * confirm. The ceiling of ten thousand is S3's own.
 */
export const StorageFileCompleteValidator = vine.create({
  parts: vine
    .array(
      vine.object({
        partNumber: vine.number().min(1).max(10_000).withoutDecimals(),
        etag: vine.string().trim().maxLength(64).minLength(1),
      }),
    )
    .optional(),
})

export type StorageFileCompletePayload = Infer<
  typeof StorageFileCompleteValidator
>

/**
 * What `GET /storages` receives.
 *
 * The panel file library: `?search` finds by original label, by generated
 * name or by type -, and `?status` and `?mimetype` narrow what has already been uploaded
 * and what is an image.
 *
 * Without `trashedField()`: `storages` has `deleted_at`, but deleting a file is
 * `DELETE /storages/:id`, which removes the row **and** the binary. There is no file
 * trash to restore from, and the parameter would be accepted and silently ignored.
 */
export const StorageFilePaginateValidator = vine.create({
  ...paginationFields(),
  status: vine.enum(UPLOAD_STATUSES).optional(),
  // The closed list, and not free text: it is the same tuple that `POST /storages`
  // accepts, so filtering by a type the API never writes is a 422 instead of an
  // empty page that looks like a bug.
  mimetype: vine.enum(STORAGE_MIMETYPES).optional(),
  ...sortFields(STORAGE_SORT_COLUMNS),
})

export type StorageFilePaginatePayload = Infer<
  typeof StorageFilePaginateValidator
>
