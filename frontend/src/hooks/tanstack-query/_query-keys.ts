import type {
  StorefrontListingPaginatePayload,
  StorefrontNeighborhoodPaginatePayload,
  StorefrontPlacePaginatePayload,
} from '@aporta/shared'

/**
 * As chaves de cache, num lugar só, com uma seção por módulo do backend
 * (`queryKeys.<módulo>.<recurso>`).
 *
 * `list` é a listagem, com os parâmetros na chave: dois filtros diferentes são duas
 * entradas, e é isso que deixa o loader da rota e o `useSuspenseQuery` do componente
 * acharem o mesmo cache. `detail` é um registro só. Todas começam com o mesmo prefixo
 * `[módulo, recurso]`, e invalidar por `all` cobre as duas formas.
 *
 * Todo recurso sai do mesmo `resource()` de propósito: uma forma por recurso é onde um
 * deles ganha uma chave que a invalidação do vizinho não alcança.
 */
function resource<TParams>() {
  return <const TScope extends readonly [string, string]>(
    ...scope: TScope
  ) => ({
    all: scope,
    list: (params: TParams) => [...scope, 'list', params] as const,
    detail: (id: string) => [...scope, 'detail', id] as const,
  })
}

export const queryKeys = {
  /**
   * A vitrine pública. O `detail` do anúncio é pelo **slug**, que é o que o endereço
   * público carrega.
   *
   * `neighborhoods` e `places` só usam `list`: o bairro é opção de filtro e o lugar é
   * card de uma lista, nenhum dos dois abre sozinho.
   */
  storefront: {
    listings: resource<StorefrontListingPaginatePayload>()(
      'storefront',
      'listings',
    ),
    neighborhoods: resource<StorefrontNeighborhoodPaginatePayload>()(
      'storefront',
      'neighborhoods',
    ),
    places: resource<StorefrontPlacePaginatePayload>()('storefront', 'places'),
  },
}
