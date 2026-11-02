import {
  HTTP_ERROR_CODE,
  HTTP_STATUS,
} from '#/integrations/tanstack-query/http'
import type { HTTPError } from '#/integrations/tanstack-query/http'
import { rateLimitedMessage } from '#/lib/rate-limited-message'
import { m } from '#/paraglide/messages'

export type ReportFailure = {
  /** A mensagem do campo dos detalhes (422); `undefined` quando a falha não é dele. */
  details: string | undefined
  /** O que não pertence a um campo. */
  general: string
}

/**
 * Por que a denúncia não foi: o 429 diz quanto esperar (o limite é por IP, e o visitante
 * não tem conta para culpar), o anúncio que saiu do ar entre abrir a página e enviar é
 * dito como tal, e o 422 dos detalhes volta ao campo. Pelo `code`, nunca pela `message`.
 */
export function describeReportFailure(error: HTTPError): ReportFailure {
  if (error.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
    return { details: undefined, general: rateLimitedMessage(error.retryAfter) }
  }

  if (error.code === HTTP_ERROR_CODE.LISTING_NOT_FOUND) {
    return { details: undefined, general: m.report_error_gone() }
  }

  if (error.errors?.['details']) {
    return { details: m.report_error_details(), general: '' }
  }

  if (error.isServerError) {
    return { details: undefined, general: m.report_error_unavailable() }
  }

  return { details: undefined, general: m.http_unexpected_error() }
}
