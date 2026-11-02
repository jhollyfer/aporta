import {
  REPORT_STATUS,
  REVIEW_NOTE_MAX,
  REVIEW_NOTE_MIN,
  left,
  right,
  type Either,
  type ReportReason,
  type ReportStatus,
} from '@aporta/shared'

import type { ReportError } from './report.errors.ts'

/**
 * The report state. `listingId` points to another aggregate and comes in only by id
 * (`_standards/domain.md` §1). `reporterHash` is the keyed hash of where the report came from,
 * never the address: the entity does not know how it was made, only that it is an opaque key.
 */
export type ReportProps = {
  readonly id: string
  readonly listingId: string
  readonly reason: ReportReason
  readonly details: string | null
  readonly reporterHash: string | null
  status: ReportStatus
  resolvedBy: string | null
  resolvedAt: Date | null
  resolutionNote: string | null
}

export type ReportCreateInput = Pick<
  ReportProps,
  'id' | 'listingId' | 'reason' | 'details' | 'reporterHash'
>

/**
 * A visitor's report that an ad may be a scam (or stale, or false). Born `OPEN`; the staff closes
 * it once, with a note. It is evidence: it is never edited and never deleted, only resolved.
 */
export default class Report {
  private constructor(private readonly props: ReportProps) {}

  static create(input: ReportCreateInput): Report {
    // A blank text is no text: `details` is either something to read or null.
    const details = input.details?.trim() || null

    return new Report({
      ...input,
      details,
      status: REPORT_STATUS.OPEN,
      resolvedBy: null,
      resolvedAt: null,
      resolutionNote: null,
    })
  }

  /** Rehydration by the repository: the data already passed the invariants when it was saved. */
  static restore(props: ReportProps): Report {
    return new Report({ ...props })
  }

  /**
   * Closes the report with what the staff found. Once: a second resolution would replace who
   * looked and what they concluded, and the first one is the record.
   */
  resolve(by: string, note: string, at: Date): Either<ReportError, Report> {
    if (this.props.status === REPORT_STATUS.RESOLVED)
      return left({ code: 'REPORT_ALREADY_RESOLVED' })

    const text = note.trim()
    if (text.length < REVIEW_NOTE_MIN || text.length > REVIEW_NOTE_MAX)
      return left({ code: 'REPORT_NOTE_INVALID' })

    this.props.status = REPORT_STATUS.RESOLVED
    this.props.resolvedBy = by
    this.props.resolvedAt = at
    this.props.resolutionNote = text

    return right(this)
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<ReportProps> {
    return { ...this.props }
  }
}
