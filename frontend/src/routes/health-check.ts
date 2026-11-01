import { createFileRoute } from '@tanstack/react-router'

/**
 * O sinal de vida do servidor de SSR, em `/health-check`
 * (`_standards/architecture.md` §7).
 *
 * Existe para o `HEALTHCHECK` do `Dockerfile-production`, o painel do Coolify e
 * o smoke test do deploy. Apontar para `/` mediria a renderização da home
 * inteira; esta rota só prova que o processo do Nitro aceita requisição e
 * roteia, que é a pergunta do orquestrador. Sem fetch, sem API, sem variável.
 *
 * Rota de servidor e não página: quem consome é o `curl` do container, que
 * precisa de status e corpo próprios. `Cache-Control: no-store` porque um proxy
 * que guardasse a resposta manteria o healthcheck verde depois de o servidor
 * morrer.
 */
export const Route = createFileRoute('/health-check')({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
          },
        }),
    },
  },
})
