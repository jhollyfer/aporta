/**
 * A file's state while it uploads. The binary does not go through the API: the
 * `POST /storages` stores the row and returns signed URLs, the browser uploads the
 * parts directly to the bucket, and `POST /storages/:id/complete` confirms. Between one
 * thing and the other the row exists without an intact binary, and that is what `PENDING`
 * names - the backend refuses to attach what is not `UPLOADED`.
 */
export const UPLOAD_STATUS = {
  PENDING: 'PENDING',
  UPLOADED: 'UPLOADED',
} as const

export type UploadStatus = (typeof UPLOAD_STATUS)[keyof typeof UPLOAD_STATUS]

export const UPLOAD_STATUSES = Object.values(UPLOAD_STATUS)
