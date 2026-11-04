import {
  AdministratorListingPaginateResponse,
  AdministratorListingShowResponse,
  AdministratorPlacePaginateResponse,
  AdministratorPlaceShowResponse,
  AdministratorReportPaginateResponse,
  AdministratorUserPaginateResponse,
  AdministratorUserShowResponse,
} from '@aporta/shared'
import type {
  AdministratorListingPaginatePayload,
  AdministratorPlacePaginatePayload,
  AdministratorReportPaginatePayload,
  AdministratorUserPaginatePayload,
} from '@aporta/shared'
import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import { WITH_SESSION, request } from '../http'
import type { ResourceQueryOptions } from '../http'

import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { queryString } from '#/lib/query-string'

/**
 * A moderação, com cookie (`WITH_SESSION`): `GET /administrator/*`. Só roda no navegador,
 * como o resto da área privada. Quem autoriza é o `middleware.role` da API; o guard do
 * `administrator/layout.tsx` só poupa a tela inútil.
 *
 * `keepPreviousData` para a fila não esvaziar na troca de estado ou de página.
 */
export const administratorListingsQueryOptions = (
  params: AdministratorListingPaginatePayload,
): ResourceQueryOptions<
  AdministratorListingPaginateResponse,
  ReturnType<typeof queryKeys.administrator.listings.list>
> =>
  queryOptions({
    queryKey: queryKeys.administrator.listings.list(params),
    queryFn: ({ signal }) =>
      request(
        AdministratorListingPaginateResponse,
        '/administrator/listings'.concat(queryString(params)),
        { signal, ...WITH_SESSION },
      ),
    placeholderData: keepPreviousData,
  })

/** Um anúncio como a equipe o lê (com o dono e a decisão anterior), pelo **id**. */
export const administratorListingQueryOptions = (
  id: string,
): ResourceQueryOptions<
  AdministratorListingShowResponse,
  ReturnType<typeof queryKeys.administrator.listings.detail>
> =>
  queryOptions({
    queryKey: queryKeys.administrator.listings.detail(id),
    queryFn: ({ signal }) =>
      request(
        AdministratorListingShowResponse,
        '/administrator/listings/'.concat(encodeURIComponent(id)),
        { signal, ...WITH_SESSION },
      ),
  })

export const administratorReportsQueryOptions = (
  params: AdministratorReportPaginatePayload,
): ResourceQueryOptions<
  AdministratorReportPaginateResponse,
  ReturnType<typeof queryKeys.administrator.reports.list>
> =>
  queryOptions({
    queryKey: queryKeys.administrator.reports.list(params),
    queryFn: ({ signal }) =>
      request(
        AdministratorReportPaginateResponse,
        '/administrator/reports'.concat(queryString(params)),
        { signal, ...WITH_SESSION },
      ),
    placeholderData: keepPreviousData,
  })

/** O guia da cidade como a equipe o lê: com o recorte da lixeira (`trashed`) e o `archivedAt`. */
export const administratorPlacesQueryOptions = (
  params: AdministratorPlacePaginatePayload,
): ResourceQueryOptions<
  AdministratorPlacePaginateResponse,
  ReturnType<typeof queryKeys.administrator.places.list>
> =>
  queryOptions({
    queryKey: queryKeys.administrator.places.list(params),
    queryFn: ({ signal }) =>
      request(
        AdministratorPlacePaginateResponse,
        '/administrator/places'.concat(queryString(params)),
        { signal, ...WITH_SESSION },
      ),
    placeholderData: keepPreviousData,
  })

/** Um lugar do guia como a equipe o lê, arquivado ou não, pelo **id**. */
export const administratorPlaceQueryOptions = (
  id: string,
): ResourceQueryOptions<
  AdministratorPlaceShowResponse,
  ReturnType<typeof queryKeys.administrator.places.detail>
> =>
  queryOptions({
    queryKey: queryKeys.administrator.places.detail(id),
    queryFn: ({ signal }) =>
      request(
        AdministratorPlaceShowResponse,
        '/administrator/places/'.concat(encodeURIComponent(id)),
        { signal, ...WITH_SESSION },
      ),
  })

/** As contas como o administrador as lê: filtro de papel e status, busca e página. */
export const administratorUsersQueryOptions = (
  params: AdministratorUserPaginatePayload,
): ResourceQueryOptions<
  AdministratorUserPaginateResponse,
  ReturnType<typeof queryKeys.administrator.users.list>
> =>
  queryOptions({
    queryKey: queryKeys.administrator.users.list(params),
    queryFn: ({ signal }) =>
      request(
        AdministratorUserPaginateResponse,
        '/administrator/users'.concat(queryString(params)),
        { signal, ...WITH_SESSION },
      ),
    placeholderData: keepPreviousData,
  })

/** Uma conta como o administrador a lê, pelo **id**. */
export const administratorUserQueryOptions = (
  id: string,
): ResourceQueryOptions<
  AdministratorUserShowResponse,
  ReturnType<typeof queryKeys.administrator.users.detail>
> =>
  queryOptions({
    queryKey: queryKeys.administrator.users.detail(id),
    queryFn: ({ signal }) =>
      request(
        AdministratorUserShowResponse,
        '/administrator/users/'.concat(encodeURIComponent(id)),
        { signal, ...WITH_SESSION },
      ),
  })
