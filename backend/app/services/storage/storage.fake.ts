import {
  left,
  right,
  type Either,
  type StorageFileShowResponse,
  type StorageMimetype,
} from '@aporta/shared'

import StorageContract, {
  type DownloadableFile,
  type SignedStorageFile,
  type StorageMetadata,
} from '#services/storage/storage.contract'
import StorageFailure from '#services/storage/storage.errors'

/** What the fake bucket stores for an object: its `Content-Type` and its first bytes. */
export type StorageContent = {
  readonly contentType: string | undefined
  readonly head: Uint8Array
}

/** The signature of a PNG: what an uploaded object is unless the test says otherwise. */
const PNG_CONTENT: StorageContent = {
  contentType: 'image/png',
  head: Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0,
  ]),
}

/**
 * The in-memory collection for the unit tests (`_standards/solid.md` §2): no bucket,
 * and the signed `url` is predictable
 * (`fake://<path>`), for the assertion to compare against.
 */
export default class StorageFake extends StorageContract {
  readonly #objects = new Map<string, number>()
  readonly #contents = new Map<string, StorageContent>()
  readonly #discarded = new Set<string>()
  #failure: StorageFailure | null = null

  key(mimetype: StorageMimetype): string {
    return `fake/${mimetype}`
  }

  async signFile(file: StorageFileShowResponse): Promise<SignedStorageFile>
  async signFile(
    file: StorageFileShowResponse | null,
  ): Promise<SignedStorageFile | null>
  signFile(
    file: StorageFileShowResponse | null,
  ): Promise<SignedStorageFile | null> {
    if (!file) return Promise.resolve(null)
    return Promise.resolve({ ...file, url: `fake://${file.path}` })
  }

  signFiles(
    files: ReadonlyArray<StorageFileShowResponse>,
  ): Promise<SignedStorageFile[]> {
    return Promise.resolve(
      files.map((file) => ({ ...file, url: `fake://${file.path}` })),
    )
  }

  /**
   * The object the bucket has, with the size that actually got uploaded. The content is a PNG
   * unless the test says otherwise (`content`): the bytes and the `Content-Type` it stored.
   */
  object(path: string, size: number, content?: Partial<StorageContent>): void {
    this.#objects.set(path, size)
    this.#contents.set(path, { ...PNG_CONTENT, ...content })
  }

  /** Whether the binary was deleted. */
  discarded(path: string): boolean {
    return this.#discarded.has(path)
  }

  /** Makes the bucket fail (network, credentials) on `metadata`, `readHead` and `discard`. */
  failWith(cause: unknown): void {
    this.#failure = StorageFailure.of(cause)
  }

  /** An object that does not exist is the typed `null`, not a failure. */
  metadata(
    path: string,
  ): Promise<Either<StorageFailure, StorageMetadata | null>> {
    if (this.#failure) return Promise.resolve(left(this.#failure))

    const size = this.#objects.get(path)
    if (size === undefined) return Promise.resolve(right(null))

    return Promise.resolve(
      right({
        contentType: this.#contents.get(path)?.contentType,
        contentLength: size,
        etag: 'fake',
        lastModified: new Date(0),
      }),
    )
  }

  readHead(
    path: string,
    length: number,
  ): Promise<Either<StorageFailure, Uint8Array | null>> {
    if (this.#failure) return Promise.resolve(left(this.#failure))

    const content = this.#contents.get(path)
    if (!this.#objects.has(path) || !content)
      return Promise.resolve(right(null))

    return Promise.resolve(right(content.head.slice(0, length)))
  }

  discard(path: string): Promise<Either<StorageFailure, null>> {
    if (this.#failure) return Promise.resolve(left(this.#failure))

    this.#objects.delete(path)
    this.#discarded.add(path)

    return Promise.resolve(right(null))
  }

  put(
    path: string,
    contents: Uint8Array,
    mimetype: StorageMimetype,
  ): Promise<Either<StorageFailure, null>> {
    if (this.#failure) return Promise.resolve(left(this.#failure))

    this.object(path, contents.byteLength, {
      contentType: mimetype,
      head: contents.slice(0, 16),
    })

    return Promise.resolve(right(null))
  }

  signedDownload(file: DownloadableFile): Promise<string> {
    return Promise.resolve(`fake://download/${file.path}`)
  }

  contentDisposition(originalName: string): string {
    return `attachment; filename="${originalName}"`
  }
}
