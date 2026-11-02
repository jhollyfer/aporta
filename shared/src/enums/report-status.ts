/** Where a scam report is in the staff's queue: waiting, or looked at with a note. */
export const REPORT_STATUS = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
} as const

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS]

export const REPORT_STATUSES = Object.values(REPORT_STATUS)
