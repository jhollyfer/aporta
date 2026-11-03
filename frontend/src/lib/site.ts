import { env } from '#/env'

/** O nome do produto, e o que fica no fim de todo título. */
export const SITE_TITLE = 'Aporta'

/**
 * O endereço público, sem barra no fim. Só para o que precisa de URL absoluta
 * (sitemap, `canonical`, cartão de link): link interno é caminho relativo, e
 * cravar o domínio nele quebraria a navegação fora de produção.
 */
export const SITE_URL = env.VITE_SITE_URL.replace(/\/+$/, '')

/**
 * Se este ambiente pode ser indexado: só `SITE_ENV=production`. Staging e preview usam a mesma
 * imagem da produção, então o valor vem do ambiente em tempo de execução, e não do build. Vale
 * só no servidor (no navegador `SITE_ENV` não existe e o resultado é `false`, por isso nenhum
 * código do cliente decide nada com ele; o guarda `import.meta.env.SSR` evita o erro do
 * `@t3-oss/env-core`, que lança ao ler variável de servidor no cliente).
 */
export const INDEXABLE = import.meta.env.SSR && env.SITE_ENV === 'production'

/** O caminho vira endereço absoluto, para `canonical` e `og:url`. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`
}
