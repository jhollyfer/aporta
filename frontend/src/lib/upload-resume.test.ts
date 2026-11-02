import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearResume,
  readResume,
  resumeKey,
  resumeStore,
  writeResume,
} from './upload-resume'

/** The key under which the store keeps the resume of a file. */
function storedKey(file: File): string {
  return resumeStore.keyOf(resumeKey(file))
}

/**
 * `localStorage` does not exist in the test environment (it runs in node), which is the
 * same case as SSR - and it is precisely the case the module has to survive.
 * Each test builds its own.
 */
function withStorage() {
  const data = new Map<string, string>()

  // `LocalStore` reads `window.localStorage`, so the stub stands in as the window.
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
      get length() {
        return data.size
      },
      key: (index: number) => [...data.keys()][index] ?? null,
    },
  })

  return data
}

function fileOf(name: string, size: number, lastModified: number): File {
  return new File([new Uint8Array(size)], name, { lastModified })
}

const FILE = fileOf('catalogo.pdf', 5_000, 1_700_000_000_000)

const ENTRY = { storageId: 'abc', uploadId: 'upload-1', partSize: 1024 }

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('resumeKey', () => {
  it('when given the same file, it is stable', () => {
    expect(resumeKey(FILE)).toBe(
      resumeKey(fileOf('catalogo.pdf', 5_000, 1_700_000_000_000)),
    )
  })

  it('when any of the three fields changes, it changes', () => {
    const base = resumeKey(FILE)

    expect(resumeKey(fileOf('outro.pdf', 5_000, 1_700_000_000_000))).not.toBe(
      base,
    )
    expect(
      resumeKey(fileOf('catalogo.pdf', 5_001, 1_700_000_000_000)),
    ).not.toBe(base)
    expect(
      resumeKey(fileOf('catalogo.pdf', 5_000, 1_700_000_000_001)),
    ).not.toBe(base)
  })
})

describe('readResume', () => {
  it('when read, it returns what was written', () => {
    withStorage()
    writeResume(FILE, ENTRY)

    expect(readResume(FILE)).toEqual(ENTRY)
  })

  it('when nothing is stored, it is null', () => {
    withStorage()

    expect(readResume(FILE)).toBeNull()
  })

  it('when cleared, it is null', () => {
    withStorage()
    writeResume(FILE, ENTRY)
    clearResume(FILE)

    expect(readResume(FILE)).toBeNull()
  })

  it('when given junk, it is null and does not blow up', () => {
    const data = withStorage()
    data.set(storedKey(FILE), 'this is not json')

    expect(readResume(FILE)).toBeNull()
  })

  it('when given json with the wrong shape, it is null', () => {
    const data = withStorage()
    data.set(storedKey(FILE), JSON.stringify({ storageId: 42 }))

    expect(readResume(FILE)).toBeNull()
  })

  it('when uploadId is null, it accepts it, which is the single-part upload', () => {
    withStorage()
    writeResume(FILE, { ...ENTRY, uploadId: null })

    expect(readResume(FILE)?.uploadId).toBeNull()
  })
})

/**
 * The entry has a deadline because the server does too: after 24h
 * `storages:prune` has already deleted the abandoned upload, and the resume points to a
 * `storageId` that no longer exists.
 */
describe('validity', () => {
  it('when expired, it is null', () => {
    withStorage()
    writeResume(FILE, ENTRY)

    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000)

    expect(readResume(FILE)).toBeNull()

    vi.useRealTimers()
  })

  it('when not yet expired, it is still valid', () => {
    withStorage()
    writeResume(FILE, ENTRY)

    vi.setSystemTime(Date.now() + 23 * 60 * 60 * 1000)

    expect(readResume(FILE)).toEqual(ENTRY)

    vi.useRealTimers()
  })

  it('when writing, it sweeps the expired entries of other files', () => {
    const data = withStorage()
    const stale = fileOf('stale.pdf', 1, 1)

    writeResume(stale, ENTRY)

    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000)

    // Nobody is going to try `stale.pdf` again: if the sweep does not reach it on
    // the write of another file, it stays on disk forever.
    writeResume(FILE, ENTRY)

    expect(data.has(storedKey(stale))).toBe(false)
    expect(data.has(storedKey(FILE))).toBe(true)

    vi.useRealTimers()
  })

  it('when sweeping, it takes along what cannot be read', () => {
    const data = withStorage()
    data.set(resumeStore.keyOf('junk.pdf:1:1'), 'this is not json')

    writeResume(FILE, ENTRY)

    expect(data.has(resumeStore.keyOf('junk.pdf:1:1'))).toBe(false)
  })

  it('when sweeping, it does not touch what is not a resume', () => {
    const data = withStorage()
    data.set('theme', 'dark')

    writeResume(FILE, ENTRY)

    expect(data.get('theme')).toBe('dark')
  })
})

describe('without localStorage', () => {
  it('when there is no storage (SSR), it reads null and writes without blowing up', () => {
    expect(() => writeResume(FILE, ENTRY)).not.toThrow()
    expect(readResume(FILE)).toBeNull()
    expect(() => clearResume(FILE)).not.toThrow()
  })
})
