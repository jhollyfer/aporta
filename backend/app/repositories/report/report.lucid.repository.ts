import { left, right, type Either, type Paginated } from '@aporta/shared'

import RepositoryFailure from '#core/repository-failure'
import Report from '#domain/report/report.entity'
import ReportModel from '#models/report'
import ReportRepository, {
  type ReportListCriteria,
  type ReportRecord,
} from '#repositories/report/report.repository'
import LucidMapping from '#repositories/shared/lucid-mapping'

/**
 * The report repository over Lucid: the only file that imports `#models/report`. The ad comes
 * preloaded (the queue draws its title) including the ones in the trash, since a report outlives the
 * ad's archiving and that is exactly when the staff reads it.
 */
export default class ReportLucidRepository extends ReportRepository {
  async findById(id: string): Promise<Report | null> {
    const row = await ReportModel.find(id)

    if (!row) return null
    return this.toEntity(row)
  }

  async paginate(
    criteria: ReportListCriteria,
  ): Promise<Paginated<ReportRecord>> {
    const query = ReportModel.query().preload('listing')

    if (criteria.status) query.where('status', criteria.status)

    if (criteria.search) {
      const search = `%${criteria.search}%`

      query.where((builder) => {
        builder
          .whereILike('details', search)
          .orWhereHas('listing', (listing) => {
            void listing.whereILike('title', search)
          })
      })
    }

    return LucidMapping.page(query, criteria, (row) => this.toRecord(row))
  }

  async save(report: Report): Promise<Either<RepositoryFailure, ReportRecord>> {
    const snapshot = report.snapshot()

    try {
      await ReportModel.updateOrCreate(
        { id: snapshot.id },
        {
          listingId: snapshot.listingId,
          reason: snapshot.reason,
          details: snapshot.details,
          reporterHash: snapshot.reporterHash,
          status: snapshot.status,
          resolvedBy: snapshot.resolvedBy,
          resolvedAt: LucidMapping.dateTime(snapshot.resolvedAt),
          resolutionNote: snapshot.resolutionNote,
        },
      )

      const saved = await ReportModel.query()
        .where('id', snapshot.id)
        .preload('listing')
        .first()

      if (!saved)
        return left(
          RepositoryFailure.of(
            new Error(`report ${snapshot.id} vanished after save`),
          ),
        )

      return right(this.toRecord(saved))
    } catch (error) {
      return left(RepositoryFailure.of(error))
    }
  }

  private toRecord(row: ReportModel): ReportRecord {
    return {
      report: this.toEntity(row),
      listing: {
        id: row.listing.id,
        slug: row.listing.slug,
        title: row.listing.title,
      },
      createdAt: row.createdAt.toJSDate(),
    }
  }

  private toEntity(row: ReportModel): Report {
    return Report.restore({
      id: row.id,
      listingId: row.listingId,
      reason: row.reason,
      details: row.details,
      reporterHash: row.reporterHash,
      status: row.status,
      resolvedBy: row.resolvedBy,
      resolvedAt: LucidMapping.date(row.resolvedAt),
      resolutionNote: row.resolutionNote,
    })
  }
}
