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
  /*
   * Cada página é uma URL própria e indexável: o canônico mantém o `page` (e só ele, o filtro
   * não gera canônico), senão o buscador trataria a página 2 como cópia da 1 e deixaria de
   * seguir os anúncios dela. O título leva "Página 2 de 3" para não repetir entre as páginas.
   */
  head: ({ loaderData }) => {
    const page = loaderData?.meta.currentPage ?? 1
    const title = m.listings_page_title()

    if (loaderData === undefined || page <= 1) {
      return pageHead({
        path: '/listings',
        title,
        description: m.listings_page_description(),
      })
    }

    const status = m.pagination_status({
      page,
      total: loaderData.meta.lastPage,
    })

    return pageHead({
      path: `/listings?page=${page}`,
      title: `${title} (${status})`,
      description: m.listings_page_description(),
      // Página além da última: a tela diz que não existe, e o buscador não deve guardá-la.
      noindex: loaderData.data.length === 0,
    })
  },
})
