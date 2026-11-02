import { randomUUID } from 'node:crypto'

import { REPORT_REASON, type ReportReason } from '@aporta/shared'

import Report from '#domain/report/report.entity'
import ReportModel from '#models/report'

/**
 * Reports for the specs: the entity without a database (unit specs) and the row (HTTP specs).
 * The listing a row points to is a foreign key, so the spec creates it and passes the id.
 */

/** A report entity, `SCAM` and with no details unless the spec says otherwise. */
export function reportDraft(
  input: Partial<Parameters<typeof Report.create>[0]> = {},
): Report {
  return Report.create({
    id: randomUUID(),
    listingId: randomUUID(),
    reason: REPORT_REASON.SCAM,
    details: null,
    reporterHash: 'c'.repeat(64),
    ...input,
  })
}

/** A report row on an existing ad. */
export function reportRow(
  listingId: string,
  attributes: Partial<ReportModel> = {},
  reason: ReportReason = REPORT_REASON.SCAM,
) {
  return ReportModel.create({
    listingId,
    reason,
    status: 'OPEN',
    reporterHash: 'c'.repeat(64),
    ...attributes,
  })
}
