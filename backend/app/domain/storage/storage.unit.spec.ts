import { UPLOAD_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import Storage from '#domain/storage/storage.entity'
import { ARCHIVED_AT, storageDraft } from '#tests/repository-fixtures'

test.group('domain > storage', () => {
  test('when created, it is PENDING, live, with the key as name and path', ({
    assert,
  }) => {
    const snapshot = storageDraft({ key: 'abc.png' }).snapshot()

    assert.equal(snapshot.status, UPLOAD_STATUS.PENDING)
    assert.equal(snapshot.filename, 'abc.png')
    assert.equal(snapshot.path, 'abc.png')
    assert.isNull(snapshot.deletedAt)
  })

  test('when confirming with the declared size, it becomes UPLOADED and drops the uploadId', ({
    assert,
  }) => {
    const storage = storageDraft({ size: 10, uploadId: 'multi' })

    assert.isTrue(storage.confirm(10).isRight())
    assert.isTrue(storage.isUploaded())
    assert.isNull(storage.snapshot().uploadId)
  })

  test('when the received size diverges, it refuses with STORAGE_SIZE_MISMATCH and stays PENDING', ({
    assert,
  }) => {
    const storage = storageDraft({ size: 10 })

    assert.deepEqual(storage.confirm(7).value, {
      code: 'STORAGE_SIZE_MISMATCH',
      declared: 10,
      received: 7,
    })
    assert.isFalse(storage.isUploaded())
  })

  test('when cancelling the PENDING one, it marks deletedAt; the confirmed and cancelled ones refuse', ({
    assert,
  }) => {
    const pending = storageDraft()
    assert.isTrue(pending.cancel(ARCHIVED_AT).isRight())
    assert.equal(
      pending.snapshot().deletedAt?.toISOString(),
      ARCHIVED_AT.toISOString(),
    )
    assert.deepEqual(pending.cancel(ARCHIVED_AT).value, {
      code: 'STORAGE_NOT_PENDING',
    })

    const uploaded = storageDraft({ size: 1 })
    uploaded.confirm(1)
    assert.deepEqual(uploaded.cancel(ARCHIVED_AT).value, {
      code: 'STORAGE_NOT_PENDING',
    })
  })

  test('when rehydrated, it returns the same state', ({ assert }) => {
    const props = storageDraft().snapshot()

    assert.deepEqual(Storage.restore(props).snapshot(), props)
  })

  const PNG_HEAD = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0,
  ])
  const SVG_HEAD = new TextEncoder().encode('<svg xmlns="http://www.w3.org')

  test('when the bytes and the Content-Type are those of the declared type, the content is verified', ({
    assert,
  }) => {
    const storage = storageDraft({ size: 10 })

    const verified = storage.verifyContent({
      contentType: 'image/png',
      head: PNG_HEAD,
    })

    assert.isTrue(verified.isRight())
    assert.isFalse(storage.isUploaded())
  })

  test('when the bytes are an SVG under a declared PNG, it refuses with STORAGE_CONTENT_MISMATCH', ({
    assert,
  }) => {
    const storage = storageDraft({ size: 10 })

    const verified = storage.verifyContent({
      contentType: 'image/png',
      head: SVG_HEAD,
    })

    assert.deepEqual(verified.value, {
      code: 'STORAGE_CONTENT_MISMATCH',
      declared: 'image/png',
      detected: null,
    })
  })

  test('when the bytes are another accepted type, it refuses and says which one they are', ({
    assert,
  }) => {
    const storage = storageDraft({ size: 10 })

    const verified = storage.verifyContent({
      contentType: 'image/png',
      head: new TextEncoder().encode('%PDF-1.7 and so on'),
    })

    assert.containsSubset(verified.value, {
      code: 'STORAGE_CONTENT_MISMATCH',
      detected: 'application/pdf',
    })
  })

  test('when the stored Content-Type is not the declared one, it refuses even if the bytes match', ({
    assert,
  }) => {
    const storage = storageDraft({ size: 10 })

    const verified = storage.verifyContent({
      contentType: 'image/svg+xml',
      head: PNG_HEAD,
    })

    assert.isTrue(verified.isLeft())
    assert.containsSubset(verified.value, { code: 'STORAGE_CONTENT_MISMATCH' })
  })
})
