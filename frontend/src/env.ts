import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

/**
 * Lê a `SERVER_API_URL`. O guarda de `import.meta.env.SSR` existe porque este módulo
 * também é avaliado no navegador, onde `process` não existe: sem ele, o `ReferenceError`
 * derrubaria a hidratação inteira. O Vite troca o `SSR` por constante no build, então o
 * ramo do servidor sai do bundle do cliente.
 */
function readServerApiUrl(): string | undefined {
  if (!import.meta.env.SSR) return undefined

  return process.env['SERVER_API_URL']
}

/**
 * As variáveis do frontend, validadas no boot. As `VITE_*` são o que o Vite
 * embute no bundle, ou seja, publica: segredo nenhum passa por aqui.
 *
 * `VITE_API_URL` é obrigatória e sem default: o frontend não tem mais dado de
 * exemplo para cair, e um build sem ela publicaria um site que só mostra tela
 * de erro. O defeito apareceria no navegador do visitante, não no build.
 *
 * `VITE_SITE_URL` tem default local porque canônico, sitemap e `og:url` só
 * precisam do domínio real em produção, e um `pnpm dev` sem `.env` não deve
 * falhar por isso.
 *
 * `SERVER_API_URL` é só do servidor (sem o prefixo `VITE_` de propósito, para
 * nunca entrar no bundle do navegador): o endereço da API visto pelo SSR, pela
 * rede interna. Vem de `process.env`, que o Vite não expõe em `import.meta.env`.
 */
export const env = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_SITE_URL: z.url().default('http://localhost:3000'),
    VITE_API_URL: z.url(),
  },
  server: {
    SERVER_API_URL: z.url().optional(),
  },
  runtimeEnv: {
    ...import.meta.env,
    SERVER_API_URL: readServerApiUrl(),
  },
  emptyStringAsUndefined: true,
})
