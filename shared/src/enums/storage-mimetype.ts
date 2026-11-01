/**
 * The file types the backend accepts to attach.
 *
 * It exists on both sides so the client refuses before spending a request -
 * and, more importantly, to say *which* file does not work. The refusal that counts
 * is still the server's.
 *
 * The four audio types are here because this project has a podcast, and the
 * episode is a file like any other.
 */
export const STORAGE_MIMETYPE = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  WEBP: 'image/webp',
  GIF: 'image/gif',
  // `image/svg+xml` is left out: SVG is HTML, it carries `<script>`, and the browser would
  // run it in the storage origin. The backend refuses it (an upload XSS finding).
  PDF: 'application/pdf',
  MPEG: 'audio/mpeg',
  MP4: 'audio/mp4',
  OGG: 'audio/ogg',
  WAV: 'audio/wav',
} as const

export type StorageMimetype =
  (typeof STORAGE_MIMETYPE)[keyof typeof STORAGE_MIMETYPE]

export const STORAGE_MIMETYPES = Object.values(STORAGE_MIMETYPE)

/**
 * The two slices of `STORAGE_MIMETYPES` that become a form field: the
 * native picker's `accept` and the refusal before `POST /storages` come from here, and
 * not from a string written by hand in each field.
 */
export const IMAGE_MIMETYPES = STORAGE_MIMETYPES.filter((mimetype) =>
  mimetype.startsWith('image/'),
)

export const AUDIO_MIMETYPES = STORAGE_MIMETYPES.filter((mimetype) =>
  mimetype.startsWith('audio/'),
)

/**
 * The extension each type gets in the object key in the bucket.
 *
 * The name the user sent is **not** a reliable source of extension - it is a
 * label, and `foto.png` may be a pdf. The extension comes from the declared `mimetype`,
 * which is the same value the URL is signed with.
 *
 * `Record<StorageMimetype, string>` makes the compiler demand one entry per
 * type: adding a mimetype above without saying what extension it has breaks the
 * compilation, instead of becoming a file without an extension in the bucket.
 */
export const STORAGE_EXTENSIONS = {
  [STORAGE_MIMETYPE.JPEG]: 'jpg',
  [STORAGE_MIMETYPE.PNG]: 'png',
  [STORAGE_MIMETYPE.WEBP]: 'webp',
  [STORAGE_MIMETYPE.GIF]: 'gif',
  [STORAGE_MIMETYPE.PDF]: 'pdf',
  [STORAGE_MIMETYPE.MPEG]: 'mp3',
  [STORAGE_MIMETYPE.MP4]: 'm4a',
  [STORAGE_MIMETYPE.OGG]: 'ogg',
  [STORAGE_MIMETYPE.WAV]: 'wav',
} as const satisfies Record<StorageMimetype, string>

/**
 * The `Content-Type` the browser must send on the `PUT` of a **part** of a multipart upload.
 *
 * The signed part URL pins `Content-Type` (`_standards/backend.md` §5.4), and `UploadPart`
 * takes no `ContentType` of its own: the SDK signs its default, `application/octet-stream`.
 * A single-part upload, instead, is signed with the file's own mimetype. The backend e2e proves
 * the bucket accepts exactly this value, so a change of the SDK default fails there and not in
 * the user's browser.
 */
export const MULTIPART_PART_CONTENT_TYPE = 'application/octet-stream'
