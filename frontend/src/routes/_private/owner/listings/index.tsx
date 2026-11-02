import { createFileRoute } from '@tanstack/react-router'

import { ownerListingsQueryOptions } from '#/integrations/tanstack-query/queries/owner-listings'
import { pageHead } from '#/lib/head'
import { m } from '#/paraglide/messages'

import { LISTINGS_PARAMS } from './-params'

/**
 * Meus anúncios. O `loader` enche o cache antes da tela, e a tela lê por
 * `useSuspenseQuery`. Roda no navegador, como toda a área privada (`ssr: false` do
 * `_private`): é onde o cookie da sessão existe.
 */
export const Route = createFileRoute('/_private/owner/listings/')({
  loader: ({ context }) =>
    context.queryClient.query(ownerListingsQueryOptions(LISTINGS_PARAMS)),
  head: () =>
    pageHead({
      path: '/owner/listings',
      title: m.owner_listings_page_title(),
      description: m.owner_listings_page_description(),
      noindex: true,
    }),
})
