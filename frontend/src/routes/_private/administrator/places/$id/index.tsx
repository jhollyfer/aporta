import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '#/components/common/empty-state'
import { PillButton } from '#/components/common/pill-button'
import { HTTP_ERROR_CODE } from '#/integrations/tanstack-query/http'
import { administratorPlaceQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { storefrontNeighborhoodsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { loadOrNotFound } from '#/lib/load-or-not-found'
import { pageHead } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

/**
 * Editar um lugar do guia. O `loader` traz o lugar (arquivado ou não) e a lista de bairros do
 * seletor. Lugar que não existe vira `notFound()`: só o `code` de recurso ausente, para API fora
 * do ar não parecer lugar apagado.
 */
export const Route = createFileRoute('/_private/administrator/places/$id/')({
  loader: async ({ context, params }) => {
    await Promise.all([
      loadOrNotFound(
        () =>
          context.queryClient.query(administratorPlaceQueryOptions(params.id)),
        HTTP_ERROR_CODE.PLACE_NOT_FOUND,
      ),
      context.queryClient.query(storefrontNeighborhoodsQueryOptions()),
    ])
  },
  head: () =>
    pageHead({
      path: '/administrator/places',
      title: m.staff_place_edit_page_title(),
      description: m.staff_place_edit_page_description(),
      noindex: true,
    }),
  notFoundComponent: () => (
    <EmptyState
      title={m.not_found_title()}
      description={m.staff_error_place_not_found()}
    >
      <PillButton to="/administrator/places" scale="lg">
        {m.staff_place_back()}
      </PillButton>
    </EmptyState>
  ),
})
