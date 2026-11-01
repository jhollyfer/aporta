import {
  MULTIPART_PART_CONTENT_TYPE,
  type StorageMimetype,
} from '@aporta/shared'
import type { ApiClient } from '@japa/api-client'

import { vine, type Infer } from '#core/validator'
import { PART_SIZE } from '#services/multipart/multipart.contract'
import { body, present } from '#tests/response-fixtures'
import type { Session } from '#tests/session-fixtures'

/**
 * The upload path that the `app/features/storage/files/<action>/` specs and the
 * `storages:prune` one walk through: opening via the real endpoint, uploading the parts
 * straight to the bucket and confirming.
 *
 * A file of its own because each upload action needs the previous step ready -
 * `complete` needs `open`, `parts` needs `put`, `delete` and `download`
 * need the whole upload -, and a copy of these helpers in each spec is where one
 * of them stops following the contract.
 */

/**
 * Content of a non-final part. S3 refuses less than 5 MB
 * (`EntityTooSmall`), and `PART_SIZE` is what the server promises per part.
 */
/** The eight bytes every PNG starts with: what `complete` reads to tell the file is a PNG. */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** A body of `length` bytes that starts like a PNG (`complete` checks the magic bytes). */
export function pngBytes(length: number, fill: number): Uint8Array {
  const bytes = new Uint8Array(length).fill(fill)
  bytes.set(PNG_SIGNATURE)

  return bytes
}

export const FULL_PART = pngBytes(PART_SIZE, 65)

export const SMALL = pngBytes(1024, 66)

/**
 * The upload plan, as `POST /storages` and `GET /storages/:id/parts` return
 * it: what the specs read from it, validated before gaining a type.
 */
export const UploadPlanValidator = vine.create(
  vine
    .object({
      storage: vine
        .object({
          id: vine.string(),
          path: vine.string(),
          originalName: vine.string(),
          status: vine.string(),
          size: vine.number(),
        })
        .allowUnknownProperties(),
      uploadId: vine.string().nullable(),
      partSize: vine.number(),
      totalParts: vine.number(),
      parts: vine.array(
        vine.object({ partNumber: vine.number(), url: vine.string() }),
      ),
      uploaded: vine.array(
        vine.object({
          partNumber: vine.number(),
          size: vine.number(),
          etag: vine.string(),
        }),
      ),
    })
    .allowUnknownProperties(),
)

/** The confirmed file, as `POST /storages/:id/complete` returns it. */
const UploadedStorageValidator = vine.create(
  vine
    .object({
      id: vine.string(),
      path: vine.string(),
      originalName: vine.string(),
      status: vine.string(),
    })
    .allowUnknownProperties(),
)

/** Opens an upload through the real endpoint and returns the envelope. */
export async function open(
  client: ApiClient,
  session: Session,
  payload: { fileName: string; mimetype: StorageMimetype; size: number },
): Promise<Infer<typeof UploadPlanValidator>> {
  const response = await client.post('/storages').cookies(session).json(payload)

  response.assertStatus(201)

  return UploadPlanValidator.validate(body(response))
}

/**
 * Sends a part to the signed URL and returns the `ETag`.
 *
 * The URL pins the `Content-Type` (`_standards/backend.md` §5.4), and the client must send
 * what it was signed with: the part of a multipart carries `partNumber` and is signed with
 * `MULTIPART_PART_CONTENT_TYPE`; a single `PUT` is signed with the file's mimetype, `image/png`
 * in these fixtures.
 */
export async function put(url: string, content: Uint8Array): Promise<string> {
  let contentType = 'image/png'
  if (new URL(url).searchParams.has('partNumber'))
    contentType = MULTIPART_PART_CONTENT_TYPE

  const response = await fetch(url, {
    method: 'PUT',
    body: content,
    headers: { 'Content-Type': contentType },
  })

  if (!response.ok) throw new Error(`PUT answered ${response.status}`)

  return response.headers.get('etag') ?? ''
}

/**
 * The complete path, from zero to `UPLOADED`, for a single-part file.
 *
 * Over HTTP, and not through the factory: the binary really goes to the bucket, which is what
 * `complete`, `delete`, `download` and `parts` check. Whoever only needs the
 * row uses `storageRecord()` from `#tests/content-fixtures`.
 */
export async function upload(
  client: ApiClient,
  session: Session,
): Promise<Infer<typeof UploadedStorageValidator>> {
  const opened = await open(client, session, {
    fileName: 'capa.png',
    mimetype: 'image/png',
    size: SMALL.byteLength,
  })

  await put(present(opened.parts[0], 'the single part').url, SMALL)

  const completed = await client
    .post(`/storages/${opened.storage.id}/complete`)
    .cookies(session)
    .json({})

  completed.assertStatus(200)

  return UploadedStorageValidator.validate(body(completed))
}
