import {
  HTTP_ERROR_CODE,
  HTTP_STATUS,
} from '#/integrations/tanstack-query/http'
import type { HTTPError } from '#/integrations/tanstack-query/http'
import { m } from '#/paraglide/messages'

/**
 * O que o servidor recusa nas rotas da equipe, por `code` (nunca pela `message`, que é texto
 * de interface do idioma de quem pediu). Os `code` são os de
 * `backend/app/features/administrator/`: o texto sai do `messages/`, nos três idiomas.
 */
const GENERAL_REFUSALS: Record<string, () => string> = {
  LISTING_NOT_PENDING: () => m.staff_error_not_pending(),
  LISTING_ALREADY_ARCHIVED: () => m.owner_error_already_archived(),
  LISTING_NOT_ARCHIVED: () => m.staff_error_not_archived(),
  LISTING_HAS_REPORTS: () => m.staff_error_has_reports(),
  [HTTP_ERROR_CODE.LISTING_NOT_FOUND]: () => m.staff_error_listing_not_found(),
  PLACE_NOT_FOUND: () => m.staff_error_place_not_found(),
  PLACE_ALREADY_ARCHIVED: () => m.staff_error_place_archived(),
  PLACE_NOT_ARCHIVED: () => m.staff_error_place_not_archived(),
  REPORT_NOT_FOUND: () => m.staff_error_report_not_found(),
  REPORT_ALREADY_RESOLVED: () => m.staff_error_report_resolved(),
  USER_NOT_FOUND: () => m.staff_error_owner_not_verifiable(),
  USER_OWN_ACCESS_CHANGE: () => m.staff_error_users_own_access(),
  USER_LAST_ADMINISTRATOR: () => m.staff_error_users_last_administrator(),
  USER_OWNS_LISTINGS: () => m.staff_error_users_owns_listings(),
  USER_NOT_VERIFIABLE: () => m.staff_error_owner_not_verifiable(),
}

/** As recusas que apontam para o campo do motivo (`note`), em qualquer das duas telas. */
const NOTE_REFUSALS: ReadonlyArray<string> = [
  'LISTING_REVIEW_NOTE_INVALID',
  'REPORT_NOTE_INVALID',
]

export type StaffFailure = {
  /** A mensagem do campo do motivo; `undefined` quando a falha não é dele. */
  note: string | undefined
  /** O que não pertence a um campo: mostrado no diálogo ou na tela. */
  general: string
}

/**
 * Separa uma falha da equipe em "o que dizer no campo do motivo" e "o que dizer à tela":
 * motivo curto ou longo demais (`code` próprio ou `errors.note` do 422) vai ao campo, o
 * resto vira a mensagem geral, pelo `code` e, na falta dele, pelo status.
 */
export function describeStaffFailure(error: HTTPError): StaffFailure {
  if (NOTE_REFUSALS.includes(error.code) || error.errors?.['note']) {
    return { note: m.staff_error_note_invalid(), general: '' }
  }

  const refusal = GENERAL_REFUSALS[error.code]

  if (refusal !== undefined) return { note: undefined, general: refusal() }

  if (error.status === HTTP_STATUS.FORBIDDEN) {
    return { note: undefined, general: m.staff_error_forbidden() }
  }

  if (error.isServerError) {
    return { note: undefined, general: m.staff_error_unavailable() }
  }

  return { note: undefined, general: m.http_unexpected_error() }
}
