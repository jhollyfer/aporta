import { useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'

import { queryKeys } from '#/hooks/tanstack-query/_query-keys'

/**
 * A raiz de cada família de chaves, pelo nome que a tela usa para pedir a invalidação.
 * É o `all` de `_query-keys.ts`: o prefixo cobre lista, detalhe e o que o recurso ganhar.
 * Nenhum array de chave é escrito aqui: a fábrica central continua sendo a dona.
 */
const FAMILIES = {
  'account.profile': queryKeys.account.profile.all,
  'administrator.listings': queryKeys.administrator.listings.all,
  'administrator.places': queryKeys.administrator.places.all,
  'administrator.reports': queryKeys.administrator.reports.all,
  'owner.listings': queryKeys.owner.listings.all,
  'storefront.listings': queryKeys.storefront.listings.all,
  'storefront.places': queryKeys.storefront.places.all,
} as const satisfies Record<string, QueryKey>

/** O que uma tela pode pedir para invalidar: o nome de uma família de `FAMILIES`. */
export type Resource = keyof typeof FAMILIES

/**
 * O único veículo de invalidação do frontend. **Devolve a promessa**: quem a retorna no
 * `onSuccess` mantém o `isPending` da mutação até o refetch voltar, e o botão não solta
 * com o dado velho (_doc-lib/tanstack-query.md#guides/invalidations-from-mutations,
 * https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations).
 *
 * O `QueryClient` vem de `useQueryClient()`: é o mesmo do contexto do router.
 */
export function useInvalidate(): (resource: Resource) => Promise<void> {
  const queryClient = useQueryClient()

  return async function invalidate(resource) {
    await queryClient.invalidateQueries({ queryKey: FAMILIES[resource] })
  }
}
