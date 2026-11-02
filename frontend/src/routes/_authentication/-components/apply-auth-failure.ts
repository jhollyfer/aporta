import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'

import {
  HTTP_ERROR_CODE,
  HTTP_STATUS,
} from '#/integrations/tanstack-query/http'
import type { HTTPError } from '#/integrations/tanstack-query/http'
import { rateLimitedMessage } from '#/lib/rate-limited-message'
import { m } from '#/paraglide/messages'

/**
 * A mensagem geral de uma falha de entrada ou de cadastro, escolhida pelo `code` e pelo
 * status, nunca pelo `message` (texto de interface, que muda com o idioma).
 *
 * Credencial errada diz "e-mail ou senha": a mesma frase para e-mail inexistente e para
 * senha errada, senão a tela confirmaria quais e-mails têm conta.
 */
function generalMessage(error: HTTPError): string {
  if (error.code === HTTP_ERROR_CODE.INVALID_CREDENTIALS) {
    return m.auth_error_credentials()
  }

  if (error.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
    return rateLimitedMessage(error.retryAfter)
  }

  if (error.isServerError) return m.auth_error_unavailable()

  return m.http_unexpected_error()
}

/**
 * Leva a falha da API para o formulário, na ordem do que é mais específico:
 *
 * 1. e-mail já usado (`USER_ALREADY_EXISTS`) vira erro **no campo e-mail**, que é onde
 *    a pessoa corrige;
 * 2. `errors` por campo (422) vai para os campos que o formulário conhece em `fields`;
 * 3. o resto vira a mensagem geral do formulário (`root`).
 *
 * `fields` é a lista fechada do que o formulário sabe destacar: uma chave de `errors`
 * fora dela (a API ganhou um campo) não some em silêncio, cai na mensagem geral.
 */
export function applyAuthFailure<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  error: HTTPError,
  fields: ReadonlyArray<Path<TValues>>,
): void {
  const email = fields.find((field) => field === 'email')

  if (error.code === HTTP_ERROR_CODE.USER_ALREADY_EXISTS && email) {
    form.setError(email, {
      type: 'server',
      message: m.auth_error_email_taken(),
    })
    return
  }

  let applied = 0

  for (const [key, message] of Object.entries(error.errors ?? {})) {
    const field = fields.find((candidate) => candidate === key)

    if (!field) continue

    form.setError(field, { type: 'server', message })
    applied += 1
  }

  if (applied > 0) return

  form.setError('root', { type: 'server', message: generalMessage(error) })
}
