import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '#/components/common/empty-state'
import { PillButton } from '#/components/common/pill-button'
import { HTTP_ERROR_CODE } from '#/integrations/tanstack-query/http'
import { administratorListingQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { pageHead } from '#/lib/head'
import { loadOrNotFound } from '#/lib/load-or-not-found'
import { m } from '#/paraglide/messages'

/**
 * O anúncio na revisão. O `loader` traz o anúncio como a equipe o lê (com o dono e a
 * decisão anterior). Anúncio que não existe vira `notFound()`: só o `code` de recurso ausente,
 * para API fora do ar não parecer anúncio apagado.
 */
export const Route = createFileRoute('/_private/administrator/listings/$id/')({
  loader: ({ context, params }) =>
    loadOrNotFound(
      () =>
        context.queryClient.query(administratorListingQueryOptions(params.id)),
      HTTP_ERROR_CODE.LISTING_NOT_FOUND,
    ),
  head: () =>
    pageHead({
      path: '/administrator/listings',
      title: m.staff_detail_page_title(),
      description: m.staff_detail_page_description(),
      noindex: true,
    }),
  notFoundComponent: () => (
    <EmptyState
      title={m.not_found_title()}
      description={m.staff_error_listing_not_found()}
    >
      <PillButton to="/administrator/listings" scale="lg">
        {m.staff_detail_back()}
      </PillButton>
    </EmptyState>
  ),
})
