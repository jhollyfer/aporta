import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Actor,
  type AdministratorReportShowResponse,
  type Either,
  type Merge,
} from '@aporta/shared'

import Translation from '#core/translation'
import type { IdentifierPayload } from '#core/validator'
import type { ReportError } from '#domain/report/report.errors'
import HTTPException from '#exceptions/http.exception'
import AdministratorReportPresenter from '#features/administrator/reports/reports.presenter'
import ReportRepository from '#repositories/report/report.repository'
import ClockContract from '#services/clock/clock.contract'
import type { AdministratorReportResolvePayload } from '#validators/administrator/reports.validator'

type Payload = Merge<
  Merge<AdministratorReportResolvePayload, IdentifierPayload>,
  { readonly actor: Actor }
>
type Response = Either<HTTPException, AdministratorReportShowResponse>

/**
 * Closes a report. The rules (once only, a note of 3 to 500 characters) are the entity's; the
 * author is the `actor`; the instant comes from the clock. The ad is not touched: archiving it is
 * its own action.
 */
@inject()
export default class AdministratorReportResolveUseCase {
  constructor(
    private readonly reports: ReportRepository,
    private readonly clock: ClockContract,
  ) {}

  async execute({ id, note, actor }: Payload): Promise<Response> {
    try {
      const report = await this.reports.findById(id)

      if (!report)
        return left(
          HTTPException.NotFound(
            Translation.t('errors.REPORT_NOT_FOUND'),
            'REPORT_NOT_FOUND',
          ),
        )

      const resolved = report.resolve(actor.id, note, this.clock.now())

      if (resolved.isLeft()) return left(this.refusal(resolved.value))

      const saved = await this.reports.save(report)

      if (saved.isLeft()) return left(this.failure(saved.value))

      return right(AdministratorReportPresenter.show(saved.value))
    } catch (error) {
      return left(this.failure(error))
    }
  }

  private static readonly HTTP = {
    REPORT_ALREADY_RESOLVED: () =>
      HTTPException.Conflict(
        Translation.t('errors.REPORT_ALREADY_RESOLVED'),
        'REPORT_ALREADY_RESOLVED',
      ),
    REPORT_NOTE_INVALID: () =>
      HTTPException.UnprocessableEntity(
        Translation.t('errors.REPORT_NOTE_INVALID'),
        'REPORT_NOTE_INVALID',
        { note: Translation.t('fields.REPORT_NOTE_INVALID') },
      ),
  } satisfies Record<ReportError['code'], () => HTTPException>

  private refusal(error: ReportError): HTTPException {
    return AdministratorReportResolveUseCase.HTTP[error.code]()
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[administrator/reports > resolve][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.ADMINISTRATOR_REPORT_RESOLVE_ERROR'),
      'ADMINISTRATOR_REPORT_RESOLVE_ERROR',
    )
  }
}
