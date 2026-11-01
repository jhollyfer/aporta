import { createFileRoute, notFound } from '@tanstack/react-router'

import { NotFoundPage } from '#/components/common/not-found-page'
import { LISTINGS } from '#/lib/data/listings'
import { pageHead } from '#/lib/head'

/**
 * O detalhe do imóvel. Anúncio que não existe é `notFound()` no loader, e a rota
 * declara o `notFoundComponent` próprio: sem ele o 404 de negócio cairia na tela
 * genérica do router, fora da casca pública.
 */
export const Route = createFileRoute('/_public/listings/$slug')({
  loader: ({ params }) => {
    const listing = LISTINGS.find((item) => item.slug === params.slug)
    if (listing === undefined) throw notFound()
    return { listing }
  },
  head: ({ loaderData }) => {
    if (loaderData === undefined) return {}
    const { listing } = loaderData
    return pageHead({
      path: `/listings/${listing.slug}`,
      title: listing.title,
      description: listing.description,
    })
  },
  notFoundComponent: () => <NotFoundPage />,
})
