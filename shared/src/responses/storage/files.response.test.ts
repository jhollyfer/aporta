import { describe, expect, it } from 'vitest'

import {
  StorageFileCreateResponse,
  StorageFileShowResponse,
} from './files.response.js'

const FILE = {
  id: '0b8f2f8e-8a5e-4d55-9f3c-2f6a3a1c9e10',
  filename: 'capa.webp',
  originalName: 'Capa.webp',
  mimetype: 'image/webp',
  size: 1024,
  path: 'storages/capa.webp',
  status: 'UPLOADED',
  partSize: null,
  uploadId: null,
  createdAt: '2026-10-29T12:00:00.000Z',
  updatedAt: null,
  deletedAt: null,
}

describe('StorageFileShowResponse', () => {
  it('when the file has no `url`, it accepts it, since Lucid omits it before signing', () => {
    expect(StorageFileShowResponse.safeParse(FILE).success).toBe(true)
  })

  it('when a field is not declared by the contract, it discards it', () => {
    const result = StorageFileShowResponse.parse({ ...FILE, extra: 1 })

    expect(result).not.toHaveProperty('extra')
  })

  it('when the state is outside `UPLOAD_STATUSES`, it refuses it', () => {
    const result = StorageFileShowResponse.safeParse({
      ...FILE,
      status: 'DONE',
    })

    expect(result.success).toBe(false)
  })
})

describe('StorageFileCreateResponse', () => {
  it('when the upload plan is single-part with no `uploadId`, it accepts it', () => {
    const result = StorageFileCreateResponse.safeParse({
      storage: {
        id: FILE.id,
        filename: FILE.filename,
        originalName: FILE.originalName,
        mimetype: FILE.mimetype,
        size: FILE.size,
        path: FILE.path,
        status: 'PENDING',
        createdAt: FILE.createdAt,
      },
      partSize: 1024,
      totalParts: 1,
      parts: [{ partNumber: 1, url: 'https://bucket/parte-1' }],
      uploaded: [],
    })

    expect(result.success).toBe(true)
  })
})
