import type { HTTPError } from '#/integrations/tanstack-query/http'
import type { FormFailure } from '#/lib/form-errors'
import { describeStaffFailure } from '#/lib/staff-failure'
import { m } from '#/paraglide/messages'

/**
 * O que o servidor recusa ao gravar um lugar, por `code` (nunca pela `message`). Cada recusa de
 * negócio aponta para o campo que a causou; o texto sai do `messages/`, nos três idiomas. Os
 * `code` são os de `backend/app/features/administrator/_shared.place-refusal.ts`.
 */
const FIELD_REFUSALS: Record<string, { field: string; message: () => string }> =
  {
    PLACE_NAME_EMPTY: {
      field: 'name',
      message: () => m.place_error_name_empty(),
    },
    PLACE_EVENT_DATE_REQUIRED: {
      field: 'date',
      message: () => m.place_error_event_date_required(),
    },
    PLACE_DATE_NOT_ALLOWED: {
      field: 'date',
      message: () => m.place_error_date_not_allowed(),
    },
    PLACE_DATE_INVALID: {
      field: 'date',
      message: () => m.place_error_date_invalid(),
    },
    NEIGHBORHOOD_NOT_FOUND: {
      field: 'neighborhood',
      message: () => m.owner_error_neighborhood_not_found(),
    },
  }

/**
 * Separa uma falha de gravação em "o que dizer em cada campo" e "o que dizer ao formulário
 * todo": recusa de negócio com campo vai ao campo; o `errors` da validação (422) vai aos campos
 * que nomeia, no idioma do pedido; o resto é a mensagem geral da equipe (lugar ausente,
 * sem permissão, servidor fora).
 */
export function describePlaceFailure(error: HTTPError): FormFailure {
  const refusal = FIELD_REFUSALS[error.code]

  if (refusal !== undefined) {
    return { fields: { [refusal.field]: refusal.message() }, general: '' }
  }

  const { root, ...fields } = error.errors ?? {}

  if (Object.keys(fields).length > 0) return { fields, general: root ?? '' }

  return { fields: {}, general: describeStaffFailure(error).general }
}
