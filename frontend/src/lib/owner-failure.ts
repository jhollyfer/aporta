import {
  HTTP_ERROR_CODE,
  HTTP_STATUS,
} from '#/integrations/tanstack-query/http'
import type { HTTPError } from '#/integrations/tanstack-query/http'
import { m } from '#/paraglide/messages'

/**
 * O que o servidor recusa nas rotas do dono, por `code` (nunca pela `message`, que é texto
 * de interface do idioma de quem pediu e muda). Cada recusa de negócio aponta para o campo
 * que a causou; o texto sai do `messages/`, nos três idiomas, e não do corpo da resposta.
 *
 * Os `code` são os de `backend/app/features/owner/_shared.listing-refusal.ts`.
 */
const FIELD_REFUSALS: Record<string, { field: string; message: () => string }> =
  {
    LISTING_TITLE_EMPTY: {
      field: 'title',
      message: () => m.owner_error_title_empty(),
    },
    LISTING_PRICE_REQUIRED: {
      field: 'monthly',
      message: () => m.owner_error_price_required(),
    },
    LISTING_PRICE_INVALID: {
      field: 'monthly',
      message: () => m.owner_error_price_invalid(),
    },
    LISTING_PERIODS_EMPTY: {
      field: 'periods',
      message: () => m.owner_error_periods_empty(),
    },
    NEIGHBORHOOD_NOT_FOUND: {
      field: 'neighborhood',
      message: () => m.owner_error_neighborhood_not_found(),
    },
  }

/** As recusas que não são de um campo do formulário: fotos, estado do anúncio, anúncio ausente. */
const GENERAL_REFUSALS: Record<string, () => string> = {
  LISTING_PHOTOS_LIMIT: () => m.owner_error_photos_limit(),
  LISTING_PHOTO_DUPLICATED: () => m.owner_error_photo_duplicated(),
  STORAGE_NOT_FOUND: () => m.owner_error_photo_file(),
  LISTING_ALREADY_ARCHIVED: () => m.owner_error_already_archived(),
  [HTTP_ERROR_CODE.LISTING_NOT_FOUND]: () => m.owner_error_not_found(),
}

/** A mensagem geral de uma falha, pelo `code` e, na falta dele, pelo status. */
export function ownerFailureMessage(error: HTTPError): string {
  const refusal = GENERAL_REFUSALS[error.code]

  if (refusal !== undefined) return refusal()

  if (error.status === HTTP_STATUS.FORBIDDEN) return m.owner_error_forbidden()

  if (error.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
    return m.owner_error_rate_limited()
  }

  if (error.isServerError) return m.owner_error_unavailable()

  return m.http_unexpected_error()
}

export type OwnerFailure = {
  /** Campo do formulário → mensagem. */
  fields: Record<string, string>
  /** O que não pertence a um campo; vazio quando só campos foram acusados. */
  general: string
}

/**
 * Separa uma falha em "o que dizer em cada campo" e "o que dizer ao formulário todo":
 *
 * 1. recusa de negócio com campo (`FIELD_REFUSALS`): a mensagem local, no campo;
 * 2. `errors` por campo da validação (422): a mensagem do servidor, que já vem no idioma
 *    do pedido (`Accept-Language`), no campo que ela nomeia;
 * 3. o resto vira a mensagem geral.
 *
 * Não toca no formulário: quem chama decide quais campos o formulário conhece.
 */
export function describeOwnerFailure(error: HTTPError): OwnerFailure {
  const refusal = FIELD_REFUSALS[error.code]

  if (refusal !== undefined) {
    return { fields: { [refusal.field]: refusal.message() }, general: '' }
  }

  const { root, ...fields } = error.errors ?? {}

  if (Object.keys(fields).length > 0 && !(error.code in GENERAL_REFUSALS)) {
    return { fields, general: root ?? '' }
  }

  return { fields: {}, general: ownerFailureMessage(error) }
}
