/**
 * Why a visitor reports an ad. The list is closed because it is what the staff sorts the queue by
 * (a `SCAM` goes first) and because free text alone is where a report turns into an insult; the
 * details are optional and go beside it.
 */
export const REPORT_REASON = {
  /** Asks for money before the visit, a deposit or a "reservation" by transfer. */
  SCAM: 'SCAM',
  /** The property is already rented or the owner does not answer. */
  NOT_AVAILABLE: 'NOT_AVAILABLE',
  /** The pictures belong to another place. */
  FAKE_PHOTOS: 'FAKE_PHOTOS',
  /** Price, address or rules that do not match what the owner said. */
  WRONG_INFO: 'WRONG_INFO',
  OTHER: 'OTHER',
} as const

export type ReportReason = (typeof REPORT_REASON)[keyof typeof REPORT_REASON]

export const REPORT_REASONS = Object.values(REPORT_REASON)
