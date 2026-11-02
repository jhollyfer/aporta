import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  REPORT_STATUS,
  SORT_DIRECTION,
  left,
  right,
  type AdministratorReportPaginateResponse,
  type Either,
  type SortDirection,
} from '@aporta/shared'

import { PAGINATION } from '#core/response'
import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import AdministratorReportPresenter from '#features/administrator/reports/reports.presenter'
import ReportRepository from '#repositories/report/report.repository'
import type { AdministratorReportPaginatePayload } from '#validators/administrator/reports.validator'

type Payload = AdministratorReportPaginatePayload
type Response = Either<HTTPException, AdministratorReportPaginateResponse>

/**
 * The staff's report queue. Like the review queue, what waits (`OPEN`) is read oldest first, and
 * what was already seen, newest first. An explicit `direction` wins.
 */
@inject()
export default class AdministratorReportPaginateUseCase {
  constructor(private readonly reports: ReportRepository) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const page = await this.reports.paginate({
        page: payload.page ?? PAGINATION.PAGE,
        perPage: payload.perPage ?? PAGINATION.PER_PAGE,
        search: payload.search,
        status: payload.status,
        sort: payload.sort ?? 'createdAt',
        direction: this.direction(payload),
      })

      return right({
        meta: page.meta,
        data: page.data.map((record) =>
          AdministratorReportPresenter.show(record),
        ),
      })
    } catch (error) {
      logger.error({ err: error }, '[administrator/reports > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.ADMINISTRATOR_REPORT_PAGINATE_ERROR'),
          'ADMINISTRATOR_REPORT_PAGINATE_ERROR',
        ),
      )
    }
  }

  private direction(payload: Payload): SortDirection {
    if (payload.direction) return payload.direction
    if (payload.status === REPORT_STATUS.OPEN) return SORT_DIRECTION.ASC

    return SORT_DIRECTION.DESC
  }
}
