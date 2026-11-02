import { z } from 'zod'

import { REPORT_STATUS } from '@aporta/shared'
import type {
  AdministratorReportPaginatePayload,
  ReportStatus,
} from '@aporta/shared'

/** A fila de denúncias abre no que ainda não foi olhado. */
export const DEFAULT_REPORT_STATUS: ReportStatus = REPORT_STATUS.OPEN

export const REPORTS_PER_PAGE = 20

/**
 * O estado da fila de denúncias na URL: o filtro e a página. Valor inválido volta ao padrão
 * (`.catch(undefined)`), como na fila de anúncios.
 */
export const reportsSearchSchema = z.object({
  status: z.enum(REPORT_STATUS).optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
})

export type ReportsSearch = z.infer<typeof reportsSearchSchema>

/** O search da URL em parâmetros da API. A ordem (mais antiga primeiro) é a do servidor. */
export function toReportParams(
  search: ReportsSearch,
): AdministratorReportPaginatePayload {
  return {
    status: search.status ?? DEFAULT_REPORT_STATUS,
    page: search.page,
    perPage: REPORTS_PER_PAGE,
  }
}
