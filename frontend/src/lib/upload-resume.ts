import { ClientUploadResumeValidator } from '@aporta/shared'
import type { Merge } from '@aporta/shared'
import { DateTime } from 'luxon'

import { LocalStore } from '#/lib/local-store'

/**
 * What the upload needs to remember to survive a reload.
 *
 * Without this, the resume only covers a network drop: the `storageId` lives in a
 * component variable, and reloading the page loses it. The upload would keep
 * existing on the server, open and invisible, and the user would restart from zero a
 * file that is already 90% in the bucket.
 *
 * `localStorage` and not TanStack's query cache: what is wanted is precisely what
 * crosses the reload, and the cache does not. It goes through `LocalStore`, the frontend's
 * single home for `localStorage` (`_standards/frontend.md` §2).
 */

export type ResumeEntry = {
  storageId: string
  /** Null on a single-part upload. */
  uploadId: string | null
  partSize: number
}

/** What goes to disk: the entry plus the time it was written. */
type StoredEntry = Merge<ResumeEntry, { savedAt: number }>

/**
 * How long a resume keeps making sense, in ms.
 *
 * Twenty-four hours because it is the window of `node ace storages:prune`: past
 * that the server has already deleted the abandoned upload, and the entry points to a
 * `storageId` that no longer exists. Without the deadline it would stay forever - whoever
 * closes the tab in the middle of an upload never comes back to clean it, and the only thing
 * that would remove it is the `404` of a resume that the user had to attempt.
 */
const TTL = 24 * 60 * 60 * 1000

/**
 * Outside data proven by the `@aporta/shared` validator: whatever lacks the expected
 * shape is no resume, and reads as `null`.
 */
export function parseStoredEntry(raw: unknown): StoredEntry | null {
  const parsed = ClientUploadResumeValidator.safeParse(raw)

  if (!parsed.success) return null

  return parsed.data
}

/** `v1`: the shape of `StoredEntry`. A change to it bumps the version and discards what is saved. */
export const resumeStore = new LocalStore<StoredEntry | null>({
  theme: 'upload-resume',
  version: 1,
  parse: parseStoredEntry,
  fallback: null,
})

/**
 * A local file's identity, to find its upload again.
 *
 * Name, size and modification date - what the File API gives without reading the content.
 * It is not a hash: computing a hash of a large file costs as much as
 * sending it, and what is wanted here is to recognize "it is the same file I was
 * sending a minute ago", not to prove identity against the world.
 *
 * The risk is recognizing as equal a swapped file that coincides in the three
 * fields. The confirmation catches the case: the size declared on the server will not
 * match what was uploaded, and the answer is `422`.
 */
export function resumeKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

export function readResume(file: File): ResumeEntry | null {
  const key = resumeKey(file)
  const entry = resumeStore.read(key)

  if (!entry) return null

  if (expired(entry)) {
    resumeStore.remove(key)
    return null
  }

  // No `savedAt`: it is this module's bookkeeping, not part of what the
  // upload needs to know to resume.
  return {
    storageId: entry.storageId,
    uploadId: entry.uploadId,
    partSize: entry.partSize,
  }
}

export function writeResume(file: File, entry: ResumeEntry): void {
  sweep()
  resumeStore.write(resumeKey(file), {
    ...entry,
    savedAt: DateTime.now().toMillis(),
  })
}

export function clearResume(file: File): void {
  resumeStore.remove(resumeKey(file))
}

/**
 * Deletes the expired resumes of **all** files, and not only that of the one
 * being sent now.
 *
 * `readResume` only reaches the entry of a file that the user tried again,
 * and most are not tried again - which is precisely why they
 * pile up. The sweep goes along with the write because it is the only moment when
 * this module is called knowing it will touch the disk anyway.
 */
function sweep(): void {
  for (const id of resumeStore.ids()) {
    const entry = resumeStore.read(id)

    // Unreadable counts as expired: there is no way to resume from it.
    if (!entry || expired(entry)) resumeStore.remove(id)
  }
}

function expired(entry: StoredEntry): boolean {
  return DateTime.now().toMillis() - entry.savedAt > TTL
}
