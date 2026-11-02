import type { AdministratorReportShowResponse } from '@aporta/shared'

import { WireDate } from '#core/response'
import type { ReportRecord } from '#repositories/report/report.repository'

/** How much of the reporter's fingerprint the staff reads: enough to match two reports, not to search for. */
const REPORTER_PREFIX = 12

/**
 * The report as the staff reads it (`_standards/architecture.md` §10), by allowlist. The reporter
 * is a short piece of the keyed hash: the full hash stays in the database, since it is the key of
 * everything else the staff cannot see.
 */
export default class AdministratorReportPresenter {
  static show(record: ReportRecord): AdministratorReportShowResponse {
    const report = record.report.snapshot()

    return {
      id: report.id,
      listing: {
        id: record.listing.id,
        slug: record.listing.slug,
        title: record.listing.title,
      },
      reason: report.reason,
      details: report.details,
      status: report.status,
      reporter: report.reporterHash?.slice(0, REPORTER_PREFIX) ?? null,
      createdAt: WireDate.iso(record.createdAt),
      resolvedAt: WireDate.isoOrNull(report.resolvedAt),
      resolvedBy: report.resolvedBy,
      resolutionNote: report.resolutionNote,
    }
  }
}
