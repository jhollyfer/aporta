import { randomUUID } from 'node:crypto'

import drive from '@adonisjs/drive/services/main'
import {
  STORAGE_EXTENSIONS,
  left,
  right,
  type Either,
  type StorageMimetype,
  type StorageFileShowResponse,
} from '@aporta/shared'
import { NoSuchKey, NotFound } from '@aws-sdk/client-s3'

import { URL_TTL } from '#config/drive'
import StorageContract, {
  type DownloadableFile,
  type SignedStorageFile,
  type StorageMetadata,
} from '#services/storage/storage.contract'
import StorageFailure from '#services/storage/storage.errors'

/**
 * Everything involving the binary: the key under which it lives in the bucket, what the
 * bucket knows about it, the signed URL and how it leaves the scene. The `storages`
 * row and "who uses this file" belong to `StorageRepository`.
 *
 * It is an injected service, and not a handful of exported functions, because whoever
 * attaches is spread around - avatar in `account` and in the users, and whatever each
 * feature that owns an image adds later. Injecting
 * lets each use-case declare the dependency it has.
 *
 * The binary does **not** pass through here: it goes from the browser straight to the
 * bucket by signed URL. What crosses this layer is metadata.
 */
export default class StorageService extends StorageContract {
  /**
   * The key under which the object will live in the bucket.
   *
   * A uuid plus the extension of the declared type. The name the user sent stays
   * only in `originalName`, as a label, and **never** becomes a path: it is third-party
   * text, and a path built from third-party text is how one overwrites
   * someone else's file.
   *
   * The extension comes from the `mimetype` and not from the sent name because the name is not a
   * reliable source - `foto.png` may be a pdf. The `mimetype` is the same value
   * the URL is signed with, so what the bucket accepts and what the key says
   * cannot diverge.
   */
  key(mimetype: StorageMimetype): string {
    return `${randomUUID()}.${STORAGE_EXTENSIONS[mimetype]}`
  }

  /**
   * The file the repository read, with the `url` signed.
   *
   * Signed, and with a deadline: the disk is private, so no address of this
   * object authorizes on its own. The URL expires at `URL_TTL`. It costs no network: the
   * FlyDrive signs through `@aws-sdk/s3-request-presigner`, locally.
   */
  async signFile(file: StorageFileShowResponse): Promise<SignedStorageFile>
  async signFile(
    file: StorageFileShowResponse | null,
  ): Promise<SignedStorageFile | null>
  async signFile(
    file: StorageFileShowResponse | null,
  ): Promise<SignedStorageFile | null> {
    if (!file) return null
    return { ...file, url: await this.#signedUrl(file.path) }
  }

  async signFiles(
    files: ReadonlyArray<StorageFileShowResponse>,
  ): Promise<SignedStorageFile[]> {
    return Promise.all(
      files.map(async (file) => ({
        ...file,
        url: await this.#signedUrl(file.path),
      })),
    )
  }

  #signedUrl(path: string): Promise<string> {
    return drive.use().getSignedUrl(path, { expiresIn: URL_TTL })
  }

  /**
   * What the bucket knows about the object: size, type, `ETag`.
   *
   * It is with this that the upload confirmation checks what **actually** got uploaded
   * against what the client declared when asking for the URLs.
   */
  async metadata(
    path: string,
  ): Promise<Either<StorageFailure, StorageMetadata | null>> {
    try {
      return right(await drive.use().getMetaData(path))
    } catch (error) {
      // FlyDrive wraps the S3 answer; `HeadObject` on a missing key is `NotFound`.
      if (error instanceof Error && error.cause instanceof NotFound)
        return right(null)

      return left(StorageFailure.of(error))
    }
  }

  /**
   * The first `length` bytes of the object, by a `Range` read: the bytes that tell what the
   * file really is (`FileSignature`), without the binary crossing this application.
   */
  async readHead(
    path: string,
    length: number,
  ): Promise<Either<StorageFailure, Uint8Array | null>> {
    try {
      return right(
        await drive
          .use()
          .getBytes(path, { range: { start: 0, end: length - 1 } }),
      )
    } catch (error) {
      // FlyDrive wraps the S3 answer: `GetObject` on a missing key is `NoSuchKey` (`NotFound`
      // in some S3-compatible servers).
      if (
        error instanceof Error &&
        (error.cause instanceof NoSuchKey || error.cause instanceof NotFound)
      )
        return right(null)

      return left(StorageFailure.of(error))
    }
  }

  /**
   * Deletes only the binary. Whoever deletes the row is `StorageRepository`, afterwards: if
   * the bucket `delete` fails, the row stays and the file remains servable -
   * an orphan binary is garbage in the bucket, an orphan record is a broken `url` on screen.
   */
  async discard(path: string): Promise<Either<StorageFailure, null>> {
    try {
      await drive.use().delete(path)

      return right(null)
    } catch (error) {
      return left(StorageFailure.of(error))
    }
  }

  /**
   * Writes the bytes under `path`, with the `Content-Type` of the declared type, which is what
   * the signed URL later serves. _doc-lib/flydrive.md#disk_api
   * (https://flydrive.dev/docs/disk_api): `put(key, contents, { contentType })`.
   */
  async put(
    path: string,
    contents: Uint8Array,
    mimetype: StorageMimetype,
  ): Promise<Either<StorageFailure, null>> {
    try {
      await drive.use().put(path, contents, { contentType: mimetype })

      return right(null)
    } catch (error) {
      return left(StorageFailure.of(error))
    }
  }

  /**
   * A temporary URL that delivers the file with its original name.
   *
   * The `Content-Disposition` travels signed inside the URL itself, and it is the bucket
   * that returns it on download - that is why the binary does not need to cross this
   * application just to gain a header - if it crossed, each download would occupy the
   * application for the duration of the transfer.
   *
   * It expires in minutes because it is the address of an action, not of a resource: whoever
   * wants the file again asks for another.
   */
  async signedDownload(file: DownloadableFile): Promise<string> {
    return drive.use().getSignedUrl(file.path, {
      expiresIn: '5 minutes',
      contentType: file.mimetype,
      contentDisposition: this.contentDisposition(file.originalName),
    })
  }

  /**
   * The `Content-Disposition` header of a download, with the original name.
   *
   * Two names in the same header because RFC 6266 asks for both: `filename=` only
   * carries ASCII and is what an old browser reads, and `filename*=UTF-8''` is what
   * preserves accents and cedillas. Sending only the second makes the file arrive with the
   * wrong name in whoever does not understand it; sending only the first loses the accent in
   * everyone.
   *
   * The ASCII fallback decomposes the accent and throws away the diacritic (`ó` -> `o`) instead
   * of going through a slug normalization: a slug would swap the extension dot
   * for a hyphen, and `relatorio-2026-pdf` opens in no program.
   * Quotes and slash become `_` because they would escape the quoted value of the header.
   */
  contentDisposition(originalName: string): string {
    const ascii = originalName
      .normalize('NFD')
      // The diacritics NFD separated from the base letter.
      .replace(/[\u0300-\u036f]/g, '')
      // What is left outside printable ASCII, plus quotes and slash, which
      // would escape the quoted value of the header.
      .replace(/["\\]|[^\u0020-\u007e]/g, '_')

    return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(originalName)}`
  }
}
