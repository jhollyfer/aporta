import { describe, expect, it } from 'vitest'

import { ClientUploadResumeValidator } from './upload-resume.validator.js'

const VALID = {
  storageId: 'abc',
  uploadId: 'upload-1',
  partSize: 1024,
  savedAt: 1_700_000_000_000,
}

function parse(raw: unknown) {
  return ClientUploadResumeValidator.safeParse(raw)
}

describe('ClientUploadResumeValidator', () => {
  it('when given a full entry, it accepts it', () => {
    expect(parse(VALID).success).toBe(true)
  })

  it('when uploadId is null, it accepts it, which is the single-part upload', () => {
    expect(parse({ ...VALID, uploadId: null }).success).toBe(true)
  })

  it('when given what is not an object, it rejects it', () => {
    expect(parse('junk').success).toBe(false)
    expect(parse(null).success).toBe(false)
  })

  it('when a field has the wrong type, it rejects it', () => {
    expect(parse({ ...VALID, storageId: 42 }).success).toBe(false)
    expect(parse({ ...VALID, partSize: '1024' }).success).toBe(false)
    expect(parse({ ...VALID, savedAt: 'now' }).success).toBe(false)
  })

  it('when the part size is zero or fractional, it rejects it', () => {
    expect(parse({ ...VALID, partSize: 0 }).success).toBe(false)
    expect(parse({ ...VALID, partSize: 1.5 }).success).toBe(false)
  })

  it('when a field is missing, it rejects it', () => {
    expect(parse({ storageId: 'abc' }).success).toBe(false)
  })
})
