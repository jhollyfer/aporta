import {
  HTTP_ERROR_CODE,
  HTTP_STATUS,
} from '#/integrations/tanstack-query/http'
import type { HTTPError } from '#/integrations/tanstack-query/http'
import type { FormFailure } from '#/lib/form-errors'
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
 * Separa a falha da API em "o que dizer em cada campo" e "o que dizer ao formulário todo",
 * na ordem do que é mais específico:
 *
 * 1. e-mail já usado (`USER_ALREADY_EXISTS`) vira erro **no campo e-mail**, que é onde
 *    a pessoa corrige;
 * 2. `errors` por campo (422) vai para os campos que o formulário conhece em `fields`;
 * 3. o resto vira a mensagem geral do formulário (`root`).
 *
 * `fields` é a lista fechada do que o formulário sabe destacar: com campo reconhecido, a
 * mensagem geral não aparece por cima do erro do campo. Uma chave de `errors` fora da lista
 * (a API ganhou um campo) não some em silêncio: sem campo reconhecido, cai na geral.
 */
export function describeAuthFailure(
  error: HTTPError,
  fields: ReadonlyArray<string>,
): FormFailure {
  if (
    error.code === HTTP_ERROR_CODE.USER_ALREADY_EXISTS &&
    fields.includes('email')
  ) {
    return { fields: { email: m.auth_error_email_taken() }, general: '' }
  }

  const errors = error.errors ?? {}

  if (Object.keys(errors).some((key) => fields.includes(key))) {
    return { fields: errors, general: '' }
  }

  return { fields: {}, general: generalMessage(error) }
}
