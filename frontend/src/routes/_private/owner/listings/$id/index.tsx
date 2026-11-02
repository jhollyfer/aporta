import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '#/components/common/empty-state'
import { PillButton } from '#/components/common/pill-button'
import { HTTP_ERROR_CODE } from '#/integrations/tanstack-query/http'
import { ownerListingQueryOptions } from '#/integrations/tanstack-query/queries/owner-listings'
import { storefrontNeighborhoodsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { pageHead } from '#/lib/head'
import { loadOrNotFound } from '#/lib/load-or-not-found'
import { m } from '#/paraglide/messages'

/**
 * Editar um anúncio da conta. O `loader` traz o anúncio e a lista de bairros, que o seletor
 * do formulário lê: o `_public` a enchia no cache, mas esta área não passa por ele. Anúncio
 * que não existe, ou que é de outra conta (o servidor responde o mesmo 404 aos dois), vira
 * `notFound()`; só o `code` de recurso ausente, para API fora do ar não parecer anúncio apagado.
 */
export const Route = createFileRoute('/_private/owner/listings/$id/')({
  loader: async ({ context, params }) => {
    await Promise.all([
      loadOrNotFound(
        () => context.queryClient.query(ownerListingQueryOptions(params.id)),
        HTTP_ERROR_CODE.LISTING_NOT_FOUND,
      ),
      context.queryClient.query(storefrontNeighborhoodsQueryOptions()),
    ])
  },
  head: () =>
    pageHead({
      path: '/owner/listings',
      title: m.owner_edit_page_title(),
      description: m.owner_edit_page_description(),
      noindex: true,
    }),
  notFoundComponent: () => (
    <EmptyState
      title={m.not_found_title()}
      description={m.owner_error_not_found()}
    >
      <PillButton to="/owner/listings" scale="lg">
        {m.owner_listings_back_to_list()}
      </PillButton>
    </EmptyState>
  ),
})
