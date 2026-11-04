import { createFileRoute } from '@tanstack/react-router'

import { storefrontNeighborhoodsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { pageHead } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

/**
 * Cadastrar um lugar no guia. O `loader` traz a lista de bairros, que o seletor do formulário
 * lê: o `_public` a enchia no cache, mas esta área não passa por ele.
 */
export const Route = createFileRoute('/_private/administrator/places/new/')({
  loader: ({ context }) =>
    context.queryClient.query(storefrontNeighborhoodsQueryOptions()),
  head: () =>
    pageHead({
      path: '/administrator/places/new',
      title: m.staff_place_new_page_title(),
      description: m.staff_place_new_page_description(),
      noindex: true,
    }),
})
