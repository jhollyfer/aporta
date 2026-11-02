import { createFileRoute } from '@tanstack/react-router'

import { listingsSearchSchema, toListingParams } from './-search'
import { storefrontListingsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { pageHead } from '#/lib/head'
import { m } from '#/paraglide/messages'

/**
 * A listagem. O filtro mora na URL (`validateSearch`) e vai para a API: quem filtra é
 * o servidor, então o filtro entra em `loaderDeps` e na chave de cache.
 *
 * `loaderDeps` devolve os parâmetros da API e não o search inteiro: `view` e `selected`
 * são da tela (alternar lista e mapa, tocar num pin) e não mudam o dado, então não
 * devem refazer o `loader`.
 */
export const Route = createFileRoute('/_public/listings/')({
  validateSearch: listingsSearchSchema,
  loaderDeps: ({ search }) => toListingParams(search),
  loader: ({ context, deps }) =>
    context.queryClient.query({
      ...storefrontListingsQueryOptions(deps),
      staleTime: 'static',
    }),
  head: () =>
    pageHead({
      path: '/listings',
      title: m.listings_page_title(),
      description: m.listings_page_description(),
    }),
})
