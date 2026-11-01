import type { StorageFileShowResponse } from '@aporta/shared'

import {
  PRESIGNED_BATCH,
  type PartToSign,
  type PresignedPart,
} from '#services/multipart/multipart.contract'

/**
 * The freshly opened file, as `POST /storages` has always returned it: without `url`
 * (there is no binary to sign yet) and without `deletedAt`.
 */
export type OpenedStorageFile = Omit<
  StorageFileShowResponse,
  'url' | 'deletedAt'
>

/**
 * What the client needs to upload the file on its own.
 *
 * It is the same shape that `GET /storages/:id/parts` returns, on purpose: starting
 * an upload and resuming it are the same question - "where do I send what" -, and
 * two shapes for the same answer would be two paths in the client.
 */
export type StorageUpload = {
  /** The file: freshly opened on creation, with `url` on resume. */
  storage: OpenedStorageFile | StorageFileShowResponse
  uploadId: string | null
  partSize: number
  totalParts: number
  /** The URLs of this batch. May be fewer than `totalParts` (see `PRESIGNED_BATCH`). */
  parts: Array<PresignedPart>
  /** The parts the bucket already has. Always empty when starting. */
  uploaded: Array<{ partNumber: number; size: number; etag: string }>
}

/** Into how many parts a file of this size is sliced. Never fewer than one. */
export function countParts(size: number, partSize: number): number {
  return Math.max(1, Math.ceil(size / partSize))
}

/**
 * The numbers of the parts still missing, at most one batch.
 *
 * It serves both the start (`uploaded` empty, returns `[1, 2, 3, …]`)
 * and the resume (returns the gap). The cut at `PRESIGNED_BATCH` is what
 * prevents a large file from turning into half a megabyte of URLs in a single response.
 */
export function pendingParts(
  totalParts: number,
  uploaded: Array<number>,
): Array<number> {
  const received = new Set(uploaded)
  const pending: Array<number> = []

  for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
    if (received.has(partNumber)) continue
    if (pending.length === PRESIGNED_BATCH) break

    pending.push(partNumber)
  }

  return pending
}

/**
 * The parts to sign, each with its own length: `partSize` for all but the last, which carries
 * what is left. The length enters the signature, so the bucket refuses a part of another size.
 */
export function partsToSign(
  size: number,
  partSize: number,
  partNumbers: ReadonlyArray<number>,
): Array<PartToSign> {
  return partNumbers.map((partNumber) => ({
    partNumber,
    contentLength: Math.min(partSize, size - (partNumber - 1) * partSize),
  }))
}
