import {
  AdministratorListingPaginateResponse,
  AdministratorListingShowResponse,
  AdministratorReportPaginateResponse,
} from '@aporta/shared'
import type {
  AdministratorListingPaginatePayload,
  AdministratorReportPaginatePayload,
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
