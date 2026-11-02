import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Either,
  type Merge,
  type StorefrontReportCreateResponse,
} from '@aporta/shared'

import Translation from '#core/translation'
import Report from '#domain/report/report.entity'
import HTTPException from '#exceptions/http.exception'
import ListingRepository from '#repositories/listing/listing.repository'
import ReportRepository from '#repositories/report/report.repository'
import IdGeneratorContract from '#services/id-generator/id-generator.contract'
import ReporterFingerprintContract from '#services/reporter-fingerprint/reporter-fingerprint.contract'
import type { StorefrontReportCreatePayload } from '#validators/storefront/reports.validator'

/** The address the report came from, read by the controller from the request. */
type Payload = Merge<
  StorefrontReportCreatePayload,
  { readonly address: string }
>
type Response = Either<HTTPException, StorefrontReportCreateResponse>

/**
 * Files a scam report from a visitor with no account.
 *
 * The honeypot is checked first and answers exactly like a success, id included: a bot that fills
 * every field must not learn which one gave it away, and it costs the staff nothing to never see
 * the report. The ad is looked up the way the storefront reads it (published and outside the
 * trash), so a draft or a nonexistent `slug` is the same `404` and the report endpoint cannot be
 * used to probe which ads exist. The address becomes a keyed hash before it touches the entity;
 * the raw address is never stored nor logged here.
 */
@inject()
export default class StorefrontReportCreateUseCase {
  constructor(
    private readonly listings: ListingRepository,
    private readonly reports: ReportRepository,
    private readonly ids: IdGeneratorContract,
    private readonly fingerprint: ReporterFingerprintContract,
  ) {}

  async execute({ address, ...payload }: Payload): Promise<Response> {
    try {
      if (payload.website) return right({ id: this.ids.next() })

      const record = await this.listings.findPublishedRecordBySlug(payload.slug)

      if (!record)
        return left(
          HTTPException.NotFound(
            Translation.t('errors.LISTING_NOT_FOUND'),
            'LISTING_NOT_FOUND',
          ),
        )

      const report = Report.create({
        id: this.ids.next(),
        listingId: record.listing.id,
        reason: payload.reason,
        details: payload.details ?? null,
        reporterHash: this.fingerprint.of(address),
      })

      const saved = await this.reports.save(report)

      if (saved.isLeft()) return left(this.failure(saved.value.cause))

      return right({ id: report.id })
    } catch (error) {
      return left(this.failure(error))
    }
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[storefront/reports > create][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.STOREFRONT_REPORT_CREATE_ERROR'),
      'STOREFRONT_REPORT_CREATE_ERROR',
    )
  }
}
