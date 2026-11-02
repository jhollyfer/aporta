import { createFileRoute } from '@tanstack/react-router'

import { FEATURED_PARAMS } from './-featured'
import { storefrontListingsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { pageHead } from '#/lib/head'
import { m } from '#/paraglide/messages'

/** A home: os dois caminhos (procuro, anuncio), a busca e os imóveis disponíveis agora. */
export const Route = createFileRoute('/_public/')({
  loader: ({ context }) =>
    context.queryClient.query({
      ...storefrontListingsQueryOptions(FEATURED_PARAMS),
      staleTime: 'static',
    }),
  head: () =>
    pageHead({
      path: '/',
      title: null,
      description: m.meta_description(),
    }),
})
