import { left, right, type Either } from '@aporta/shared'

import MultipartContract, {
  type PartToSign,
  type PresignedPart,
  type UploadedPart,
} from '#services/multipart/multipart.contract'
import MultipartFailure from '#services/multipart/multipart.errors'

/**
 * The in-memory multipart for the unit tests (`_standards/solid.md` §2): the fake bucket
 * keeps the parts the test says were uploaded, and the URLs come out
 * predictable (`fake://<key>/<part>`) for the assertion to compare against.
 */
export default class MultipartFake extends MultipartContract {
  #issued = 0
  readonly #parts = new Map<string, UploadedPart[]>()
  readonly #completed = new Set<string>()
  readonly #aborted = new Set<string>()
  readonly #signed: PartToSign[] = []
  #failure: MultipartFailure | null = null

  /** A part the client already uploaded to the `uploadId`. */
  putPart(uploadId: string, part: UploadedPart): void {
    this.#parts.set(uploadId, [...(this.#parts.get(uploadId) ?? []), part])
  }

  /** The parts (number and length) that were asked to be signed, in order. */
  signed(): ReadonlyArray<PartToSign> {
    return [...this.#signed]
  }

  completed(uploadId: string): boolean {
    return this.#completed.has(uploadId)
  }

  aborted(uploadId: string): boolean {
    return this.#aborted.has(uploadId)
  }

  /** Makes the bucket fail (network, credentials, timeout) on every operation. */
  failWith(cause: unknown): void {
    this.#failure = MultipartFailure.of(cause)
  }

  initiate(): Promise<Either<MultipartFailure, string>> {
    if (this.#failure) return Promise.resolve(left(this.#failure))

    this.#issued += 1
    return Promise.resolve(right(`upload-${this.#issued}`))
  }

  signParts(
    key: string,
    _uploadId: string,
    parts: ReadonlyArray<PartToSign>,
  ): Promise<Either<MultipartFailure, Array<PresignedPart>>> {
    if (this.#failure) return Promise.resolve(left(this.#failure))

    this.#signed.push(...parts)

    return Promise.resolve(
      right(
        parts.map(({ partNumber }) => ({
          partNumber,
          url: `fake://${key}/${partNumber}`,
        })),
      ),
    )
  }

  signSingle(
    key: string,
    _contentType: string,
    contentLength: number,
  ): Promise<Either<MultipartFailure, string>> {
    if (this.#failure) return Promise.resolve(left(this.#failure))

    this.#signed.push({ partNumber: 1, contentLength })

    return Promise.resolve(right(`fake://${key}`))
  }

  listParts(
    _key: string,
    uploadId: string,
  ): Promise<Either<MultipartFailure, UploadedPart[]>> {
    if (this.#failure) return Promise.resolve(left(this.#failure))

    return Promise.resolve(right([...(this.#parts.get(uploadId) ?? [])]))
  }

  complete(
    _key: string,
    uploadId: string,
  ): Promise<Either<MultipartFailure, null>> {
    if (this.#failure) return Promise.resolve(left(this.#failure))

    this.#completed.add(uploadId)

    return Promise.resolve(right(null))
  }

  abort(
    _key: string,
    uploadId: string,
  ): Promise<Either<MultipartFailure, null>> {
    if (this.#failure) return Promise.resolve(left(this.#failure))

    this.#aborted.add(uploadId)

    return Promise.resolve(right(null))
  }
}
