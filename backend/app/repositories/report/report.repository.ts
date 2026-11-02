import type {
  Either,
  Merge,
  Paginated,
  REPORT_SORT_COLUMNS,
  ReportStatus,
} from '@aporta/shared'

import type { PageCriteria } from '#core/page-criteria'
import type RepositoryFailure from '#core/repository-failure'
import type Report from '#domain/report/report.entity'

/** The ad a report points to, reduced to what the queue draws: the entity holds only its id. */
export type ReportListing = {
  readonly id: string
  readonly slug: string
  readonly title: string
}

/** The report as it is read: the entity, the ad it points to and the creation stamp. */
export type ReportRecord = {
  readonly report: Report
  readonly listing: ReportListing
  readonly createdAt: Date
}

export type ReportSortColumn = (typeof REPORT_SORT_COLUMNS)[number]

/** The staff's queue, by status. */
export type ReportListCriteria = Merge<
  PageCriteria<ReportSortColumn>,
  { readonly status?: ReportStatus }
>

/**
 * The report persistence, by intent (`_standards/domain.md` §5.1). A report is written once by the
 * visitor and resolved once by the staff; there is no update of its content and no delete, since it
 * is evidence.
 */
export default abstract class ReportRepository {
  abstract findById(id: string): Promise<Report | null>

  abstract paginate(
    criteria: ReportListCriteria,
  ): Promise<Paginated<ReportRecord>>

  /** Writes the report and returns it as it ended up, with the ad it points to. */
  abstract save(
    report: Report,
  ): Promise<Either<RepositoryFailure, ReportRecord>>
}
