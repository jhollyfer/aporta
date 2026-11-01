import type { Either } from '@aporta/shared'

import type MultipartFailure from '#services/multipart/multipart.errors'

/** A part the client is yet to send, and the address to send it to. */
export type PresignedPart = {
  partNumber: number
  url: string
}

/**
 * A part to sign: which one, and how many bytes it carries. The size goes into the signature
 * (`_standards/backend.md` §5.4): the bucket refuses a `PUT` whose body has another length.
 */
export type PartToSign = {
  readonly partNumber: number
  readonly contentLength: number
}

/** A part the bucket already received. The `etag` is what `complete` requires. */
export type UploadedPart = {
  partNumber: number
  size: number
  etag: string
}

/**
 * The size of each part, in bytes.
 *
 * 10 MB and not 5 MB, which is the S3 minimum: at double the size it is half the
 * parts, half the connections and half the URLs to sign. The 10,000
 * parts per upload cap becomes a 100 GB cap per file, comfortable for the
 * 1 GiB `UPLOAD_MAX_SIZE`.
 */
export const PART_SIZE = 10 * 1024 * 1024

/**
 * How many URLs come out in a single response.
 *
 * A large file has too many parts to sign all at once: each signed URL
 * is about 500 bytes, and a thousand of them would be half a megabyte of JSON to
 * deliver before the first byte of the file went up. The client asks for the next
 * batch at `GET /storages/:id/parts`, which is the same endpoint as the resume.
 */
export const PRESIGNED_BATCH = 100

/**
 * The conversation in parts with the bucket (`CreateMultipartUpload`, `UploadPart`,
 * `ListParts`, `CompleteMultipartUpload`, `AbortMultipartUpload`).
 *
 * A contract (`_standards/solid.md` §2) because it is external I/O: the use-case types this
 * contract, and `providers/storage.provider.ts` binds it to `MultipartService`.
 *
 * Every method answers `Either<MultipartFailure, _>`: a bucket failure (including a timeout)
 * is a typed `left`, never a `throw` (`_standards/backend.md` §5.3).
 */
export default abstract class MultipartContract {
  abstract initiate(
    key: string,
    contentType: string,
  ): Promise<Either<MultipartFailure, string>>
  abstract signParts(
    key: string,
    uploadId: string,
    parts: ReadonlyArray<PartToSign>,
    expiresIn?: number,
  ): Promise<Either<MultipartFailure, Array<PresignedPart>>>
  abstract signSingle(
    key: string,
    contentType: string,
    contentLength: number,
    expiresIn?: number,
  ): Promise<Either<MultipartFailure, string>>
  abstract listParts(
    key: string,
    uploadId: string,
  ): Promise<Either<MultipartFailure, Array<UploadedPart>>>
  abstract complete(
    key: string,
    uploadId: string,
    parts: Array<{ partNumber: number; etag: string }>,
  ): Promise<Either<MultipartFailure, null>>
  abstract abort(
    key: string,
    uploadId: string,
  ): Promise<Either<MultipartFailure, null>>
}
