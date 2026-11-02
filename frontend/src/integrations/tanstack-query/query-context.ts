import { QueryClient } from '@tanstack/react-query'

import { HTTPError } from './http'

/** Quantas vezes uma leitura que falhou por servidor ou rede é refeita. */
const MAX_QUERY_RETRIES = 2

/**
 * O `retry` de toda leitura (_doc-lib/tanstack-query.md#guides/query-retries).
 *
 * 404 e 422 não mudam de resposta na terceira tentativa, só atrasam a mensagem na
 * tela. 5xx e falha de rede (status 0) merecem outra chance. Sem esta regra o
 * `LISTING_NOT_FOUND` do detalhe esperaria três tentativas antes de virar 404.
 *
 * O `instanceof` fica mesmo com o `Register.defaultError` declarado em `http.ts`:
 * aquilo é promessa de compilação, e um throw que não vem de `request` (um bug, um
 * `TypeError`) chega do mesmo jeito.
 */
export function shouldRetryQuery(failures: number, error: unknown): boolean {
  // No servidor quem espera é o visitante, com o HTML preso: com a API fora do ar,
  // as tentativas com espera crescente segurariam a resposta por segundos antes da
  // tela de erro. No navegador a tela anterior continua de pé enquanto se tenta.
  if (import.meta.env.SSR) return false

  if (error instanceof HTTPError && !error.isServerError) return false

  return failures < MAX_QUERY_RETRIES
}

/**
 * O `QueryClient` que vai para o contexto do router.
 *
 * Um por requisição, e nunca singleton de módulo: no servidor o módulo é compartilhado
 * por todos os visitantes, e um cache de módulo entregaria o dado de um para o próximo.
 * O `getContext` roda dentro do `getRouter`, que o Start chama a cada requisição, e o
 * isolamento vem daí.
 */
export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Com o default `0` todo dado que veio pronto do servidor nasce velho e é
        // refeito na hidratação: a primeira carga pagaria o pedido duas vezes. Um
        // minuto é curto para não segurar dado velho e longo para cobrir a hidratação.
        staleTime: 60 * 1000,
        retry: shouldRetryQuery,
      },
    },
  })

  return {
    queryClient,
  }
}
