import { UPLOAD_STATUSES } from '../../enums/upload-status.js'
import { z } from '../../validator.js'
import { ResponseRule } from '../envelope.js'

/**
 * The file as the panel reads it: the serialized `Storage` model.
 *
 * `z.object`, closed like every response here: a field that the schema does not declare
 * vanishes on the frontend's `parse` instead of becoming an `unknown` type (`z.looseObject`
 * would type the object with an `[k: string]: unknown` index, which TanStack Router
 * refuses as serializable data), and the OpenAPI publishes it with
 * `additionalProperties: false` (_doc-lib/zod.md#json-schema, "Object schemas").
 *
 * `url` is optional: it is derived from `path` by a `@computed` that only resolves it
 * after `StorageContract.signFile`/`signFiles`, and Lucid omits the `undefined` computed
 * from the JSON. `partSize` and `uploadId` belong to the multipart in progress, and are null on a
 * file that uploaded in one go.
 */
export const StorageFileShowResponse = z.object({
  id: z.string(),
  filename: z.string(),
  originalName: z.string(),
  mimetype: z.string(),
  size: z.number(),
  path: z.string(),
  status: z.enum(UPLOAD_STATUSES),
  url: z.string().optional(),
  partSize: z.number().nullable(),
  uploadId: z.string().nullable(),
  createdAt: ResponseRule.datetime().nullable(),
  updatedAt: ResponseRule.datetime().nullable(),
  deletedAt: ResponseRule.datetime().nullable(),
})

export type StorageFileShowResponse = z.infer<typeof StorageFileShowResponse>

/** `POST /storages/:id/complete` answers with the file read from the database. */
export const StorageFileCompleteResponse = StorageFileShowResponse

export type StorageFileCompleteResponse = z.infer<
  typeof StorageFileCompleteResponse
>

export const StorageFilePaginateResponse = ResponseRule.paginated(
  StorageFileShowResponse,
)

export type StorageFilePaginateResponse = z.infer<
  typeof StorageFilePaginateResponse
>

/**
 * The upload plan that `POST /storages` returns: it is **not** the file, it is
 * where to upload it. The record goes inside it, in `storage`.
 *
 * `storage.url` is optional because `POST /storages` does not return it: the binary
 * has not uploaded yet, and the `@computed` returns `undefined`. `GET /storages/:id/parts`
 * signs and brings it. `uploadId` is null when the file fit in a single part and
 * goes up by a simple `PUT`; `parts` may have fewer than `totalParts` (the batch
 * signed at a time), and `uploaded` is always empty at the start.
 */
export const StorageFileCreateResponse = z.object({
  storage: z.object({
    id: z.uuid(),
    filename: z.string(),
    originalName: z.string(),
    mimetype: z.string(),
    size: z.number(),
    path: z.string(),
    status: z.enum(UPLOAD_STATUSES),
    url: z.string().optional(),
    createdAt: ResponseRule.datetime(),
    updatedAt: ResponseRule.datetime().nullable().optional(),
    deletedAt: ResponseRule.datetime().nullable().optional(),
  }),
  uploadId: z.string().nullable().optional(),
  partSize: z.number(),
  totalParts: z.number(),
  parts: z.array(z.object({ partNumber: z.number(), url: z.string() })),
  uploaded: z.array(
    z.object({ partNumber: z.number(), size: z.number(), etag: z.string() }),
  ),
})

export type StorageFileCreateResponse = z.infer<
  typeof StorageFileCreateResponse
>

/**
 * `GET /storages/:id/parts` answers the same shape as `POST /storages`:
 * starting an upload and resuming it are the same question, "where do I send
 * what".
 */
export const StorageFilePartsResponse = StorageFileCreateResponse

export type StorageFilePartsResponse = z.infer<typeof StorageFilePartsResponse>
