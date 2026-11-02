import { m } from '#/paraglide/messages'

const SECONDS_PER_MINUTE = 60

/**
 * O 429 diz quando voltar: com `Retry-After` legível, em minutos cheios (arredonda
 * para cima, para a pessoa não voltar um segundo cedo e levar outro 429). Sem ele,
 * "em alguns minutos". O cabeçalho só chega ao JavaScript se a API o expõe no CORS;
 * quando não chega, o texto sem número é o que sobra.
 *
 * Mora em `lib/` porque a entrada, o cadastro e a denúncia anônima falam do mesmo
 * limite por IP do mesmo jeito, e a conta de minutos não pode divergir entre eles.
 */
export function rateLimitedMessage(retryAfter: number | undefined): string {
  if (retryAfter === undefined) return m.auth_error_rate_limited()

  const minutes = Math.ceil(retryAfter / SECONDS_PER_MINUTE)

  return m.auth_error_rate_limited_wait({ minutes })
}
