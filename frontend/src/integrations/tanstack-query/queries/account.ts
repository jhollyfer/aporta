import { AccountProfileShowResponse } from '@aporta/shared'
import { queryOptions } from '@tanstack/react-query'

import { HTTPError, HTTP_STATUS, WITH_SESSION, request } from '../http'
import type { ResourceQueryOptions } from '../http'

import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { clearSessionHint } from '#/lib/session-hint'

/**
 * A sessão: quem está logado é dado do servidor, e dado do servidor mora no cache do
 * TanStack Query. Não há store, contexto nem hook de auth próprio.
 *
 * `queryOptions` e não objeto solto para que o `beforeLoad` dos layouts e o `useQuery`
 * do cabeçalho usem literalmente a mesma chave: o segundo aproveita o cache que o
 * primeiro encheu.
 *
 * Só roda no navegador: o cookie da sessão não chega ao servidor de SSR, então quem
 * chama (portão, guard inverso, cabeçalho) pergunta depois da hidratação.
 */
export const accountOptions = (): ResourceQueryOptions<
  AccountProfileShowResponse,
  typeof queryKeys.account.profile.all
> =>
  queryOptions({
    queryKey: queryKeys.account.profile.all,
    queryFn: async ({ signal }) => {
      try {
        return await request(AccountProfileShowResponse, '/account', {
          signal,
          ...WITH_SESSION,
        })
      } catch (error) {
        // 401 aqui já passou pela renovação de `request`: a sessão acabou de verdade.
        // Apagar a dica evita perguntar de novo a cada página até a próxima entrada.
        if (
          error instanceof HTTPError &&
          error.status === HTTP_STATUS.UNAUTHORIZED
        ) {
          clearSessionHint()
        }

        throw error
      }
    },
    // O 401 já foi tratado dentro de `request`; repetir não muda a resposta, só atrasa
    // o redirecionamento para a entrada.
    retry: false,
  })
