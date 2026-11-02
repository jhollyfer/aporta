import {
  StorefrontListingPaginateResponse,
  StorefrontListingShowResponse,
  StorefrontNeighborhoodPaginateResponse,
  StorefrontPlacePaginateResponse,
} from '@aporta/shared'
import type {
  StorefrontListingPaginatePayload,
  StorefrontNeighborhoodPaginatePayload,
  StorefrontPlacePaginatePayload,
} from '@aporta/shared'
import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import { request } from '../http'
import type { ResourceQueryOptions } from '../http'

import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { queryString } from '#/lib/query-string'

/**
 * O teto de `perPage` da API (`Rule.paginationFields` do `@aporta/shared`). As telas que
 * mostram o conjunto inteiro de uma vez (mapa de pins, abas do guia, opções de bairro,
 * sitemap) pedem nele, e o limite é conhecido: acima de 100 registros precisam paginar.
 */
export const MAX_PER_PAGE = 100

/**
 * A vitrine pública, sem sessão: `GET /storefront/*`. O que limita o que sai daqui é o
 * recorte do servidor (só anúncio publicado), não quem está do outro lado.
 *
 * O `signal` vem da própria biblioteca e é repassado ao `fetch`: sem ele, uma query
 * cujo componente desmonta antes de resolver não cancela nada.
 */

/**
 * Os anúncios publicados, filtrados e ordenados **no servidor**.
 *
 * `keepPreviousData` para a tela não esvaziar no meio da navegação quando o filtro
 * muda: sem ele, trocar o filtro passa por `pending` e a grade some.
 */
export const storefrontListingsQueryOptions = (
  params: StorefrontListingPaginatePayload,
): ResourceQueryOptions<
  StorefrontListingPaginateResponse,
  ReturnType<typeof queryKeys.storefront.listings.list>
> =>
  queryOptions({
    queryKey: queryKeys.storefront.listings.list(params),
    queryFn: ({ signal }) =>
      request(
        StorefrontListingPaginateResponse,
        '/storefront/listings'.concat(queryString(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

/** Pelo **slug**, que é o que o endereço público carrega. O corpo vem cru, sem envelope. */
export const storefrontListingQueryOptions = (
  slug: string,
): ResourceQueryOptions<
  StorefrontListingShowResponse,
  ReturnType<typeof queryKeys.storefront.listings.detail>
> =>
  queryOptions({
    queryKey: queryKeys.storefront.listings.detail(slug),
    queryFn: ({ signal }) =>
      request(
        StorefrontListingShowResponse,
        '/storefront/listings/'.concat(encodeURIComponent(slug)),
        { signal },
      ),
  })

/**
 * Os bairros, que alimentam os seletores e os chips. São poucos e mudam raramente, então
 * a lista inteira vem numa página só (`perPage` no teto da API).
 */
export const storefrontNeighborhoodsQueryOptions = (
  params: StorefrontNeighborhoodPaginatePayload = {
    perPage: MAX_PER_PAGE,
    sort: 'name',
    direction: 'asc',
  },
): ResourceQueryOptions<
  StorefrontNeighborhoodPaginateResponse,
  ReturnType<typeof queryKeys.storefront.neighborhoods.list>
> =>
  queryOptions({
    queryKey: queryKeys.storefront.neighborhoods.list(params),
    queryFn: ({ signal }) =>
      request(
        StorefrontNeighborhoodPaginateResponse,
        '/storefront/neighborhoods'.concat(queryString(params)),
        { signal },
      ),
  })

/** Os lugares do guia, por aba (`category`). */
export const storefrontPlacesQueryOptions = (
  params: StorefrontPlacePaginatePayload,
): ResourceQueryOptions<
  StorefrontPlacePaginateResponse,
  ReturnType<typeof queryKeys.storefront.places.list>
> =>
  queryOptions({
    queryKey: queryKeys.storefront.places.list(params),
    queryFn: ({ signal }) =>
      request(
        StorefrontPlacePaginateResponse,
        '/storefront/places'.concat(queryString(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })
