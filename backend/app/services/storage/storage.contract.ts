import type {
  Either,
  Merge,
  StorageFileShowResponse,
  StorageMimetype,
} from '@aporta/shared'

import type StorageFailure from '#services/storage/storage.errors'

/** What the download URL needs to know about the file. */
export type DownloadableFile = {
  readonly path: string
  readonly mimetype: string
  readonly originalName: string
}

/** The file as shared describes it, with the `url` already signed. */
export type SignedStorageFile = Merge<StorageFileShowResponse, { url: string }>

/** What the bucket knows about the object: the same shape as FlyDrive's `getMetaData`. */
export type StorageMetadata = {
  contentType?: string
  contentLength: number
  etag: string
  lastModified: Date
}

/**
 * The binary in the bucket: key, metadata, signed URL and disposal. The row in
 * `storages` belongs to `StorageRepository`.
 *
 * A contract (`_standards/solid.md` §2) because it is external I/O - the S3 bucket - and it is
 * here that the vendor changes and that a test swaps the implementation. The use-case
 * types this contract; `providers/storage.provider.ts` binds it to `StorageService`.
 */
export default abstract class StorageContract {
  abstract key(mimetype: StorageMimetype): string
  /** For the use-case that receives the file from the repository, and not the Lucid row. */
  abstract signFile(file: StorageFileShowResponse): Promise<SignedStorageFile>
  abstract signFile(
    file: StorageFileShowResponse | null,
  ): Promise<SignedStorageFile | null>
  /** The gallery the repository returns, each file with the `url` signed. */
  abstract signFiles(
    files: ReadonlyArray<StorageFileShowResponse>,
  ): Promise<SignedStorageFile[]>
  /**
   * What the bucket knows about the object. `null` is the typed answer "the object does not
   * exist" (S3 `NotFound`); any other failure comes back as `StorageFailure`.
   */
  abstract metadata(
    path: string,
  ): Promise<Either<StorageFailure, StorageMetadata | null>>
  /**
   * The first `length` bytes of the object (a `Range` read, never the whole file), for the
   * check of the real type against the declared one. `null` is the typed answer "the object
   * does not exist"; any other failure comes back as `StorageFailure`.
   */
  abstract readHead(
    path: string,
    length: number,
  ): Promise<Either<StorageFailure, Uint8Array | null>>
  /**
   * Deletes only the binary. The row belongs to `StorageRepository`. An object that is
   * already gone is success (S3 `DeleteObject` is idempotent); a bucket failure is `StorageFailure`.
   */
  abstract discard(path: string): Promise<Either<StorageFailure, null>>
  /**
   * Writes a binary this application already holds, under `path`. The upload of a user never
   * comes through here (it goes from the browser to the bucket by signed URL); what does is
   * a file the server itself produced or fetched, such as the pictures of the demo seed.
   */
  abstract put(
    path: string,
    contents: Uint8Array,
    mimetype: StorageMimetype,
  ): Promise<Either<StorageFailure, null>>
  abstract signedDownload(file: DownloadableFile): Promise<string>
  abstract contentDisposition(originalName: string): string
}
