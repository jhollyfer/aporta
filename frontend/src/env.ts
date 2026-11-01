import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

/**
 * As variáveis públicas do frontend, validadas no boot. Só `VITE_*`: o prefixo
 * é o que manda o Vite embutir o valor no bundle, ou seja, publicá-lo, então
 * segredo nenhum passa por aqui.
 *
 * `VITE_SITE_URL` tem default local porque canônico, sitemap e `og:url` só
 * precisam do domínio real em produção, e um `pnpm dev` sem `.env` não deve
 * falhar por isso.
 */
export const env = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_SITE_URL: z.url().default('http://localhost:3000'),
    VITE_API_URL: z.url().optional(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
})
