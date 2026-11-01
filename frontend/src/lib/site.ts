import { env } from '#/env'

/** O nome do produto, e o que fica no fim de todo título. */
export const SITE_TITLE = 'Aporta'

/**
 * O endereço público, sem barra no fim. Só para o que precisa de URL absoluta
 * (sitemap, `canonical`, cartão de link): link interno é caminho relativo, e
 * cravar o domínio nele quebraria a navegação fora de produção.
 */
export const SITE_URL = env.VITE_SITE_URL.replace(/\/+$/, '')

/** O caminho vira endereço absoluto, para `canonical` e `og:url`. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`
}
