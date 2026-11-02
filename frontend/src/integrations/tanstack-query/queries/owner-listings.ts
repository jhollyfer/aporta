import {
  OwnerListingPaginateResponse,
  OwnerListingShowResponse,
} from '@aporta/shared'
import type { OwnerListingPaginatePayload } from '@aporta/shared'
import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import { WITH_SESSION, request } from '../http'
import type { ResourceQueryOptions } from '../http'

import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { queryString } from '#/lib/query-string'

/**
 * Os anúncios do dono logado: `GET /owner/listings`. Com cookie (`WITH_SESSION`), e o
 * recorte é a sessão: o servidor nunca recebe um "de quem" do corpo ou da URL.
 *
 * Só roda no navegador, como o resto da área privada: o servidor de SSR não recebe o
 * cookie da pessoa.
 */
export const ownerListingsQueryOptions = (
  params: OwnerListingPaginatePayload,
): ResourceQueryOptions<
  OwnerListingPaginateResponse,
  ReturnType<typeof queryKeys.owner.listings.list>
> =>
  queryOptions({
    queryKey: queryKeys.owner.listings.list(params),
    queryFn: ({ signal }) =>
      request(
        OwnerListingPaginateResponse,
        '/owner/listings'.concat(queryString(params)),
        { signal, ...WITH_SESSION },
      ),
    placeholderData: keepPreviousData,
  })

/** Um anúncio do dono, pelo **id**: o corpo traz o estado e a chave de cada foto. */
export const ownerListingQueryOptions = (
  id: string,
): ResourceQueryOptions<
  OwnerListingShowResponse,
  ReturnType<typeof queryKeys.owner.listings.detail>
> =>
  queryOptions({
    queryKey: queryKeys.owner.listings.detail(id),
    queryFn: ({ signal }) =>
      request(
        OwnerListingShowResponse,
        '/owner/listings/'.concat(encodeURIComponent(id)),
        { signal, ...WITH_SESSION },
      ),
  })
