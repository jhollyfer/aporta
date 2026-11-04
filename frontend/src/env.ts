import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

/**
 * Lê uma variável só do servidor. O guarda de `import.meta.env.SSR` existe porque este módulo
 * também é avaliado no navegador, onde `process` não existe: sem ele, o `ReferenceError`
 * derrubaria a hidratação inteira. O Vite troca o `SSR` por constante no build, então o
 * ramo do servidor sai do bundle do cliente.
 */
function readServerEnv(name: string): string | undefined {
  if (!import.meta.env.SSR) return undefined

  return process.env[name]
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
 *
 * `VITE_UPLOAD_MAX_SIZE` é o espelho do `UPLOAD_MAX_SIZE` da API (`_standards/backend.md` §6.2):
 * o teto por arquivo, em bytes. Opcional: ausente, o cliente não recusa por tamanho e o `422` do
 * servidor diz o limite. Entra no bundle em tempo de build, como toda `VITE_*`.
 *
 * `SITE_ENV` é só do servidor e opcional: onde o site roda. Só `production` deixa o site ser
 * indexado; qualquer outro valor (ou ausente) responde `noindex` e `Disallow: /`. Existe porque
 * `import.meta.env.PROD` é igual em staging e em produção (a imagem é a mesma): quem decide é o
 * ambiente em tempo de execução (`_standards/frontend.md` §9.7).
 *
 * `STORAGE_PUBLIC_URL` também é só do servidor, e opcional: a origem da URL assinada (o
 * `STORAGE_ENDPOINT` da API no MinIO, com path-style; no R2, `https://<bucket>.<host do
 * endpoint>`, porque o SDK põe o bucket no subdomínio), que o `Content-Security-Policy` libera em `img-src` e
 * `connect-src` para a foto abrir e o envio em partes chegar. Ausente, o CSP não menciona o
 * bucket e as fotos reais são bloqueadas pelo navegador: sem a variável, só as cenas
 * desenhadas aparecem. Lida em tempo de execução, então muda sem refazer o build.
 */
export const env = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_SITE_URL: z.url().default('http://localhost:3000'),
    VITE_API_URL: z.url(),
    VITE_UPLOAD_MAX_SIZE: z.coerce.number().int().positive().optional(),
  },
  server: {
    SERVER_API_URL: z.url().optional(),
    SITE_ENV: z.string().optional(),
    STORAGE_PUBLIC_URL: z.url().optional(),
  },
  runtimeEnv: {
    ...import.meta.env,
    SERVER_API_URL: readServerEnv('SERVER_API_URL'),
    SITE_ENV: readServerEnv('SITE_ENV'),
    STORAGE_PUBLIC_URL: readServerEnv('STORAGE_PUBLIC_URL'),
  },
  emptyStringAsUndefined: true,
})
