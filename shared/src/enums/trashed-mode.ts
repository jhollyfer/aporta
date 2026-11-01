/**
 * The listings' trash slice. Absent is the usual one - active only.
 *
 * The values are **lowercase**, unlike the other enums: it is what the
 * backend declares, and what it compares. `'ONLY'` in the URL is not an empty trash, it is
 * `422`.
 *
 * Not to be confused with `NOTICE_STATUS`, which is publication state. Here it is
 * `deletedAt`, the logical removal that holds for every table.
 */
export const TRASHED_MODE = {
  /** Only what is in the trash. It is the restore screen's listing. */
  ONLY: 'only',
  /** Active and removed together. */
  WITH: 'with',
} as const

export type TrashedMode = (typeof TRASHED_MODE)[keyof typeof TRASHED_MODE]

export const TRASHED_MODES = Object.values(TRASHED_MODE)
