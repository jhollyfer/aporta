import { STORAGE_MIMETYPE, STORAGE_MIMETYPES } from '@aporta/shared'
import { test } from '@japa/runner'

import FileSignature from '#domain/shared/file-signature.value-object'

/** The bytes of the text, then zeros up to the read length. */
function head(...chunks: Array<Array<number> | string>): Uint8Array {
  const bytes: Array<number> = []

  for (const chunk of chunks) {
    if (typeof chunk === 'string')
      bytes.push(...[...chunk].map((char) => char.charCodeAt(0)))
    if (typeof chunk !== 'string') bytes.push(...chunk)
  }

  return Uint8Array.from([
    ...bytes,
    ...new Array<number>(Math.max(0, FileSignature.LENGTH - bytes.length)).fill(
      0,
    ),
  ])
}

const SAMPLES = [
  [STORAGE_MIMETYPE.PNG, head([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a])],
  [STORAGE_MIMETYPE.JPEG, head([0xff, 0xd8, 0xff, 0xe0])],
  [STORAGE_MIMETYPE.GIF, head('GIF89a')],
  [STORAGE_MIMETYPE.WEBP, head('RIFF', [1, 2, 3, 4], 'WEBP')],
  [STORAGE_MIMETYPE.PDF, head('%PDF-1.7')],
  [STORAGE_MIMETYPE.MPEG, head('ID3', [4, 0])],
  [STORAGE_MIMETYPE.MPEG, head([0xff, 0xfb, 0x90, 0x00])],
  [STORAGE_MIMETYPE.MP4, head([0, 0, 0, 0x20], 'ftypM4A ')],
  [STORAGE_MIMETYPE.OGG, head('OggS')],
  [STORAGE_MIMETYPE.WAV, head('RIFF', [1, 2, 3, 4], 'WAVE')],
] as const

test.group('domain > shared > file signature (unit)', () => {
  for (const [mimetype, bytes] of SAMPLES) {
    test(`when the bytes are those of ${mimetype}, detects it`, ({
      assert,
    }) => {
      const signature = FileSignature.create(bytes)

      assert.isTrue(signature.isRight())
      assert.equal(signature.isRight() && signature.value.mimetype, mimetype)
    })
  }

  test('when the bytes are an SVG, detects nothing', ({ assert }) => {
    assert.isTrue(FileSignature.create(head('<svg xmlns="http://www')).isLeft())
  })

  test('when the bytes are HTML, detects nothing', ({ assert }) => {
    assert.isTrue(FileSignature.create(head('<!DOCTYPE html><html>')).isLeft())
  })

  test('when the read is empty, detects nothing', ({ assert }) => {
    assert.isTrue(FileSignature.create(new Uint8Array(0)).isLeft())
  })

  test('when a RIFF container is neither WEBP nor WAVE, detects nothing', ({
    assert,
  }) => {
    assert.isTrue(
      FileSignature.create(head('RIFF', [1, 2, 3, 4], 'AVI ')).isLeft(),
    )
  })

  test('when the bytes are refused, the left says why and carries no status', ({
    assert,
  }) => {
    const refused = FileSignature.create(head('<svg'))

    assert.deepEqual(refused.value, { code: 'FILE_SIGNATURE_UNKNOWN' })
  })

  test('when two signatures are of the same type, they are equal', ({
    assert,
  }) => {
    const first = FileSignature.create(head('%PDF-1.4'))
    const second = FileSignature.create(head('%PDF-1.7'))
    const other = FileSignature.create(head('OggS'))

    assert.isTrue(
      first.isRight() && second.isRight() && first.value.equals(second.value),
    )
    assert.isFalse(
      first.isRight() && other.isRight() && first.value.equals(other.value),
    )
  })

  test('when every accepted type is listed, each one has a sample here', ({
    assert,
  }) => {
    const covered = new Set<string>(SAMPLES.map(([mimetype]) => mimetype))

    assert.deepEqual([...covered].sort(), [...STORAGE_MIMETYPES].sort())
  })
})
