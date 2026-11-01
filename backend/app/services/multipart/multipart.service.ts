import { inject } from '@adonisjs/core'
import { left, right, type Either } from '@aporta/shared'
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  ListPartsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { bucket } from '#config/drive'
import MultipartContract, {
  type PartToSign,
  type PresignedPart,
  type UploadedPart,
} from '#services/multipart/multipart.contract'
import MultipartFailure from '#services/multipart/multipart.errors'

/**
 * For how long a signed URL is valid, in seconds.
 *
 * One hour, and not the whole day: a leaked URL remains usable until it expires,
 * and the cost of expiring early is low because the resume already knows how to ask for a new URL
 * for the missing parts.
 */
const URL_EXPIRES_IN = 60 * 60

/**
 * What the signature of a write URL pins besides the address: the type and the size of the
 * body (`_standards/backend.md` §5.4). The SDK default signs neither, so a URL issued for a
 * PNG would accept an SVG; with these two the bucket answers 403 when the `PUT` carries another
 * `Content-Type` or another `Content-Length`. The multipart part pins both too: `UploadPart`
 * takes no `Content-Type`, so the client sends `MULTIPART_PART_CONTENT_TYPE` and the signature
 * holds it to that (`multipart.unit.spec.ts`).
 * _doc-lib/flydrive.md#services/s3, `getSignedUrl` of `@aws-sdk/s3-request-presigner`.
 */
const PINNED_HEADERS = new Set(['content-type', 'content-length'])

/**
 * S3's multipart, which FlyDrive does not expose.
 *
 * FlyDrive covers the whole file - `put`, `get`, `delete`, `getUrl`,
 * `getSignedUrl` - and is what `StorageService` uses. What does not exist there is the
 * conversation in parts (`CreateMultipartUpload`, `UploadPart`, `ListParts`,
 * `CompleteMultipartUpload`, `AbortMultipartUpload`), and it is what makes an
 * upload resumable. That is why this service talks to the SDK directly, with the same
 * connection FlyDrive uses (`config/drive.ts`).
 *
 * Nothing here knows `storages` or HTTP: it is the layer that translates
 * "I want to upload this in pieces" into the protocol, and it answers with an `Either` whose
 * `left` is the `MultipartFailure` of the SDK call, never a `throw`. Whoever decides when to
 * start, confirm or abort is the use-case.
 *
 * The client comes from the container (`providers/storage.provider.ts`), and not from a
 * `new` in here: it is what lets a test point to another bucket or
 * simulate a storage failure without touching the process environment.
 */
@inject()
export default class MultipartService extends MultipartContract {
  constructor(private readonly client: S3Client) {
    super()
  }

  /**
   * Opens an upload in parts and returns the `UploadId` that identifies the conversation.
   *
   * From here on the bucket keeps the received parts under that identifier,
   * and nothing appears at the final key until `complete`. It is what lets the client
   * vanish midway and come back later.
   */
  async initiate(
    key: string,
    contentType: string,
  ): Promise<Either<MultipartFailure, string>> {
    try {
      const response = await this.client.send(
        new CreateMultipartUploadCommand({
          Bucket: bucket,
          Key: key,
          ContentType: contentType,
        }),
      )

      // S3 always returns `UploadId` on a successful `CreateMultipartUpload`; the
      // SDK type marks it optional because the response is shared with other
      // operations. Without it there is no upload to resume or to confirm.
      if (!response.UploadId) {
        return left(
          MultipartFailure.of(
            new Error(`Storage returned no UploadId for key ${key}`),
          ),
        )
      }

      return right(response.UploadId)
    } catch (error) {
      return left(MultipartFailure.of(error))
    }
  }

  /**
   * The URLs to send the indicated parts, one per part.
   *
   * It receives **which** parts to sign, and not how many, because the resume needs to
   * sign only what is missing. A new upload asks for `[1, 2, 3, ...]`; a resumed one
   * asks for the gap that is left. Each part carries its length, which goes into the
   * signature: the last part is smaller than the others.
   */
  async signParts(
    key: string,
    uploadId: string,
    parts: ReadonlyArray<PartToSign>,
    expiresIn: number = URL_EXPIRES_IN,
  ): Promise<Either<MultipartFailure, Array<PresignedPart>>> {
    try {
      return right(
        await Promise.all(
          parts.map(async ({ partNumber, contentLength }) => {
            const url = await getSignedUrl(
              this.client,
              new UploadPartCommand({
                Bucket: bucket,
                Key: key,
                UploadId: uploadId,
                PartNumber: partNumber,
                ContentLength: contentLength,
              }),
              { expiresIn, signableHeaders: PINNED_HEADERS },
            )

            return { partNumber, url }
          }),
        ),
      )
    } catch (error) {
      return left(MultipartFailure.of(error))
    }
  }

  /**
   * The URL of a whole-file upload, without parts.
   *
   * It exists because multipart only pays off when there is more than one part: a 40 KB
   * avatar needs no `UploadId`, no collected `ETag` and no two-step
   * confirmation - it needs a `PUT`.
   */
  async signSingle(
    key: string,
    contentType: string,
    contentLength: number,
    expiresIn: number = URL_EXPIRES_IN,
  ): Promise<Either<MultipartFailure, string>> {
    try {
      return right(
        await getSignedUrl(
          this.client,
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType,
            ContentLength: contentLength,
          }),
          { expiresIn, signableHeaders: PINNED_HEADERS },
        ),
      )
    } catch (error) {
      return left(MultipartFailure.of(error))
    }
  }

  /**
   * The parts the bucket already received, in order.
   *
   * It is what answers "where do I continue from": the client compares with what it
   * intended to send and resends only the gap.
   *
   * It paginates on purpose. `ListParts` returns at most a thousand parts per
   * call, and a file at the ceiling has more than that - without the loop, resuming
   * a large file would resend everything from the thousand-and-first part.
   */
  async listParts(
    key: string,
    uploadId: string,
  ): Promise<Either<MultipartFailure, Array<UploadedPart>>> {
    try {
      const parts: Array<UploadedPart> = []
      let marker: string | undefined

      do {
        const response = await this.client.send(
          new ListPartsCommand({
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
            PartNumberMarker: marker,
          }),
        )

        for (const part of response.Parts ?? []) {
          if (!part.PartNumber || !part.ETag) continue

          parts.push({
            partNumber: part.PartNumber,
            size: part.Size ?? 0,
            etag: part.ETag,
          })
        }

        marker = undefined
        if (response.IsTruncated) marker = response.NextPartNumberMarker
      } while (marker !== undefined)

      return right(parts.sort((a, b) => a.partNumber - b.partNumber))
    } catch (error) {
      return left(MultipartFailure.of(error))
    }
  }

  /**
   * Closes the upload: the bucket reassembles the parts at the final key.
   *
   * The list must come ordered by `partNumber` and with the `ETag` each part
   * returned - that is how the storage checks that none was lost or arrived
   * half-done.
   */
  async complete(
    key: string,
    uploadId: string,
    parts: Array<{ partNumber: number; etag: string }>,
  ): Promise<Either<MultipartFailure, null>> {
    try {
      await this.client.send(
        new CompleteMultipartUploadCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: {
            Parts: parts
              .slice()
              .sort((a, b) => a.partNumber - b.partNumber)
              .map((part) => ({
                PartNumber: part.partNumber,
                ETag: part.etag,
              })),
          },
        }),
      )

      return right(null)
    } catch (error) {
      return left(MultipartFailure.of(error))
    }
  }

  /**
   * Discards the upload and the parts already received.
   *
   * Without this, a cancelled upload leaves the parts occupying the bucket
   * forever: they do not show up in the object listing and keep being
   * billed.
   */
  async abort(
    key: string,
    uploadId: string,
  ): Promise<Either<MultipartFailure, null>> {
    try {
      await this.client.send(
        new AbortMultipartUploadCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
        }),
      )

      return right(null)
    } catch (error) {
      return left(MultipartFailure.of(error))
    }
  }
}
