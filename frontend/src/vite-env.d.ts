/// <reference types="vite/client" />

/**
 * As variáveis de ambiente que este frontend lê, tipadas para o
 * `import.meta.env` não cair no `any` do index signature do Vite.
 *
 * `interface` aqui é module augmentation, o único caso em que o TypeScript não
 * aceita `type`.
 */
interface ImportMetaEnv {
  /** O endereço público do site, sem barra no fim: canônico, sitemap e `og:url`. */
  readonly VITE_SITE_URL?: string
  /** Base da API AdonisJS, sem barra no fim. Obrigatória: o frontend lê tudo dela. */
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
