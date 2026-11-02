/**
 * The scam report domain facts: what the entity refuses, with no HTTP status or screen text
 * (`_standards/domain.md` §2).
 */

/** Closing a report that was already closed: the first resolution stays, with its author and its note. */
export type ReportAlreadyResolved = {
  readonly code: 'REPORT_ALREADY_RESOLVED'
}

/** Closing a report without a note the next person can read (`REVIEW_NOTE_MIN` to `REVIEW_NOTE_MAX`). */
export type ReportNoteInvalid = { readonly code: 'REPORT_NOTE_INVALID' }

export type ReportError = ReportAlreadyResolved | ReportNoteInvalid
