import { createFileRoute } from '@tanstack/react-router'

import { listingsSearchSchema } from './-search'
import { pageHead } from '#/lib/head'
import { m } from '#/paraglide/messages'

/**
 * A listagem. O filtro mora na URL (`validateSearch`), e `loaderDeps` não é
 * necessário porque os dados são os mesmos para todo filtro: quem filtra é a
 * tela, sobre `lib/data`. Quando a lista vier da API, o filtro entra em
 * `loaderDeps` e na `queryKey`.
 */
export const Route = createFileRoute('/_public/listings/')({
  validateSearch: listingsSearchSchema,
  head: () =>
    pageHead({
      path: '/listings',
      title: m.listings_page_title(),
      description: m.listings_page_description(),
    }),
})
