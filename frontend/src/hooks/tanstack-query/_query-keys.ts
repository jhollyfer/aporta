import type {
  AdministratorListingPaginatePayload,
  AdministratorReportPaginatePayload,
  OwnerListingPaginatePayload,
  StorefrontListingPaginatePayload,
  StorefrontListingPinsPayload,
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
   * A sessão. `profile` é `GET /account`, lido pelo portão do `_private`, pelo guard
   * inverso do `_authentication` e pelo cabeçalho, todos pela mesma chave: é o que faz o
   * segundo consumidor aproveitar o cache do primeiro em vez de repetir o pedido.
   */
  account: {
    profile: {
      all: ['account', 'profile'] as const,
    },
  },
  /**
   * O lado da equipe na moderação (`/administrator/*`): a fila de anúncios e as denúncias.
   * Família à parte da do dono, porque a equipe lê **todos** os anúncios, em qualquer
   * estado, e um cache não serve ao outro. O `detail` do anúncio é pelo **id**.
   */
  administrator: {
    listings: resource<AdministratorListingPaginatePayload>()(
      'administrator',
      'listings',
    ),
    reports: resource<AdministratorReportPaginatePayload>()(
      'administrator',
      'reports',
    ),
  },
  /**
   * Os anúncios do dono logado (`/owner/listings`). Família à parte da vitrine: o dono vê
   * o que ainda não está no ar (em análise) e a vitrine nunca, então um cache não serve ao
   * outro. O `detail` é pelo **id**, que é o que as rotas do dono carregam.
   */
  owner: {
    listings: resource<OwnerListingPaginatePayload>()('owner', 'listings'),
  },
  /**
   * A vitrine pública. O `detail` do anúncio é pelo **slug**, que é o que o endereço
   * público carrega.
   *
   * `neighborhoods` e `places` só usam `list`: o bairro é opção de filtro e o lugar é
   * card de uma lista, nenhum dos dois abre sozinho.
   */
  storefront: {
    listings: {
      ...resource<StorefrontListingPaginatePayload>()('storefront', 'listings'),
      /** Os pins da janela do mapa: uma entrada por filtro e janela arredondada. */
      pins: (params: StorefrontListingPinsPayload) =>
        ['storefront', 'listings', 'pins', params] as const,
    },
    neighborhoods: resource<StorefrontNeighborhoodPaginatePayload>()(
      'storefront',
      'neighborhoods',
    ),
    places: resource<StorefrontPlacePaginatePayload>()('storefront', 'places'),
  },
}
