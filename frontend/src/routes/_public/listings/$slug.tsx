import { createFileRoute } from '@tanstack/react-router'

import { NotFoundPage } from '#/components/common/not-found-page'
import { HTTP_ERROR_CODE } from '#/integrations/tanstack-query/http'
import { storefrontListingQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { pageHead } from '#/lib/head'
import { loadOrNotFound } from '#/lib/load-or-not-found'

/**
 * O detalhe do imóvel. Anúncio que não existe é `notFound()` no loader, e a rota
 * declara o `notFoundComponent` próprio: sem ele o 404 de negócio cairia na tela
 * genérica do router, fora da casca pública.
 */
export const Route = createFileRoute('/_public/listings/$slug')({
  // O `loader` devolve o anúncio para o `head` (título e descrição entram no HTML do
  // servidor); o componente lê do mesmo cache por `useSuspenseQuery`. Só o `code` de
  // recurso ausente vira 404: API fora do ar é erro, não "anúncio inexistente".
  loader: ({ context, params }) =>
    loadOrNotFound(
      () =>
        context.queryClient.query({
          ...storefrontListingQueryOptions(params.slug),
          staleTime: 'static',
        }),
      HTTP_ERROR_CODE.LISTING_NOT_FOUND,
    ),
  head: ({ loaderData: listing }) => {
    if (listing === undefined) return {}
    return pageHead({
      path: `/listings/${listing.slug}`,
      title: listing.title,
      description: listing.description,
    })
  },
  notFoundComponent: () => <NotFoundPage />,
})
