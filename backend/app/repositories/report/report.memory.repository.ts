import { left, right, type Either, type Paginated } from '@aporta/shared'

import MemoryRows, { type SortValue } from '#core/memory-rows'
import RepositoryFailure from '#core/repository-failure'
import Report, { type ReportProps } from '#domain/report/report.entity'
import ReportRepository, {
  type ReportListCriteria,
  type ReportListing,
  type ReportRecord,
} from '#repositories/report/report.repository'

type Row = { readonly props: ReportProps; readonly createdAt: Date }

/**
 * The in-memory report repository (`_standards/domain.md` §5.3): the use-case unit tests use it and
 * the contract test runs the same cases against it as against Lucid. `putListing` is how a spec says
 * which ads exist; saving a report for another is a failure, like the foreign key.
 */
export default class ReportMemoryRepository extends ReportRepository {
  readonly #rows = new Map<string, Row>()
  readonly #listings = new Map<string, ReportListing>()

  /** An ad a report may point to. */
  putListing(listing: ReportListing): void {
    this.#listings.set(listing.id, structuredClone(listing))
  }

  /** Seeds a report with the instant a spec wants, without going through `save`. */
  put(report: Report, createdAt: Date = new Date()): void {
    const snapshot = report.snapshot()

    this.#rows.set(snapshot.id, {
      props: structuredClone(snapshot),
      createdAt,
    })
  }

  findById(id: string): Promise<Report | null> {
    const row = this.#rows.get(id)
    if (!row) return Promise.resolve(null)

    return Promise.resolve(this.entity(row))
  }

  paginate(criteria: ReportListCriteria): Promise<Paginated<ReportRecord>> {
    const found = [...this.#rows.values()].filter((row) => {
      const listing = this.#listings.get(row.props.listingId)

      return (
        listing !== undefined &&
        (criteria.status === undefined ||
          row.props.status === criteria.status) &&
        MemoryRows.contains(
          [row.props.details ?? '', listing.title],
          criteria.search,
        )
      )
    })

    return Promise.resolve(
      MemoryRows.page(found, criteria, {
        sortValue: (row): SortValue => row.createdAt,
        toItem: (row) => this.record(row),
      }),
    )
  }

  save(report: Report): Promise<Either<RepositoryFailure, ReportRecord>> {
    const snapshot = report.snapshot()

    if (!this.#listings.has(snapshot.listingId))
      return Promise.resolve(
        left(RepositoryFailure.of(new Error('listing does not exist'))),
      )

    const stored = this.#rows.get(snapshot.id)
    this.put(report, stored?.createdAt)

    const saved = this.#rows.get(snapshot.id)
    if (!saved)
      return Promise.resolve(
        left(RepositoryFailure.of(new Error('report vanished after save'))),
      )

    return Promise.resolve(right(this.record(saved)))
  }

  private entity(row: Row): Report {
    return Report.restore(structuredClone(row.props))
  }

  private record(row: Row): ReportRecord {
    const listing = this.#listings.get(row.props.listingId)

    return {
      report: this.entity(row),
      listing: structuredClone(
        listing ?? { id: row.props.listingId, slug: '', title: '' },
      ),
      createdAt: row.createdAt,
    }
  }
}
