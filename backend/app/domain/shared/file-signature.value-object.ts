import {
  STORAGE_MIMETYPE,
  left,
  right,
  type Either,
  type StorageMimetype,
} from '@aporta/shared'

/**
 * The signature domain fact: the bytes are none of the accepted types, with no HTTP status or
 * screen text (`_standards/domain.md` §2). Whoever translates is the entity that asked.
 */
export type FileSignatureUnknown = { readonly code: 'FILE_SIGNATURE_UNKNOWN' }

/**
 * The type a file really is, read from its first bytes (magic bytes): a backend-only value
 * object (`_standards/domain.md` §3), immutable, born only from bytes that match one of the
 * accepted types, and equal to another by that type.
 *
 * The `Content-Type` and the extension are what the client **declares**; the bytes are what
 * got stored. `complete` compares the two (`_standards/backend.md` §5.4): a `.png` whose bytes
 * are an SVG is recognized as nothing, and nothing is not the declared PNG.
 */
export default class FileSignature {
  /** How many bytes from the start of the object are enough to tell every accepted type. */
  static readonly LENGTH = 16

  /**
   * What the first bytes of each accepted type look like. `Record<StorageMimetype, _>` makes
   * the compiler demand one entry per type: adding a mimetype to `shared/` without saying how
   * to recognize it breaks the compilation, instead of becoming a type that can never be
   * confirmed.
   */
  private static readonly SIGNATURES = {
    [STORAGE_MIMETYPE.JPEG]: (head) =>
      FileSignature.startsWith(head, [0xff, 0xd8, 0xff]),
    [STORAGE_MIMETYPE.PNG]: (head) =>
      FileSignature.startsWith(
        head,
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      ),
    [STORAGE_MIMETYPE.GIF]: (head) =>
      FileSignature.hasText(head, 0, 'GIF87a') ||
      FileSignature.hasText(head, 0, 'GIF89a'),
    [STORAGE_MIMETYPE.WEBP]: (head) =>
      FileSignature.hasText(head, 0, 'RIFF') &&
      FileSignature.hasText(head, 8, 'WEBP'),
    [STORAGE_MIMETYPE.PDF]: (head) => FileSignature.hasText(head, 0, '%PDF-'),
    [STORAGE_MIMETYPE.MPEG]: (head) =>
      FileSignature.hasText(head, 0, 'ID3') || FileSignature.isMpegFrame(head),
    [STORAGE_MIMETYPE.MP4]: (head) => FileSignature.hasText(head, 4, 'ftyp'),
    [STORAGE_MIMETYPE.OGG]: (head) => FileSignature.hasText(head, 0, 'OggS'),
    [STORAGE_MIMETYPE.WAV]: (head) =>
      FileSignature.hasText(head, 0, 'RIFF') &&
      FileSignature.hasText(head, 8, 'WAVE'),
  } as const satisfies Record<StorageMimetype, (head: Uint8Array) => boolean>

  private constructor(readonly mimetype: StorageMimetype) {}

  /** The accepted type these bytes belong to, or `left` when they are none of them. */
  static create(head: Uint8Array): Either<FileSignatureUnknown, FileSignature> {
    for (const mimetype of Object.values(STORAGE_MIMETYPE)) {
      if (FileSignature.SIGNATURES[mimetype](head))
        return right(new FileSignature(mimetype))
    }

    return left({ code: 'FILE_SIGNATURE_UNKNOWN' })
  }

  equals(other: FileSignature): boolean {
    return this.mimetype === other.mimetype
  }

  /** Whether `head` carries `text` (ASCII) starting at `offset`. */
  private static hasText(
    head: Uint8Array,
    offset: number,
    text: string,
  ): boolean {
    return [...text].every(
      (char, index) => head[offset + index] === char.charCodeAt(0),
    )
  }

  /** Whether `head` starts with exactly these bytes. */
  private static startsWith(
    head: Uint8Array,
    bytes: ReadonlyArray<number>,
  ): boolean {
    return bytes.every((byte, index) => head[index] === byte)
  }

  /**
   * An MPEG audio frame header: eleven bits of sync (`0xFF` and the top three bits of the next
   * byte), and a version and a layer that are not the reserved ones.
   */
  private static isMpegFrame(head: Uint8Array): boolean {
    const first = head[0]
    const second = head[1]

    if (first === undefined || second === undefined) return false

    const version = (second >> 3) & 0b11
    const layer = (second >> 1) & 0b11

    return (
      first === 0xff && (second & 0xe0) === 0xe0 && version !== 1 && layer !== 0
    )
  }
}
