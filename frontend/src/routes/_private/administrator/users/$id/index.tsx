import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '#/components/common/empty-state'
import { PillButton } from '#/components/common/pill-button'
import { HTTP_ERROR_CODE } from '#/integrations/tanstack-query/http'
import { administratorUserQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { loadOrNotFound } from '#/lib/load-or-not-found'
import { pageHead } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

/**
 * Uma conta para o administrador. O `loader` traz a conta; conta que não existe vira
 * `notFound()`, só pelo `code` de recurso ausente, para API fora do ar não parecer conta apagada.
 */
export const Route = createFileRoute('/_private/administrator/users/$id/')({
  loader: ({ context, params }) =>
    loadOrNotFound(
      () => context.queryClient.query(administratorUserQueryOptions(params.id)),
      HTTP_ERROR_CODE.USER_NOT_FOUND,
    ),
  head: () =>
    pageHead({
      path: '/administrator/users',
      title: m.staff_user_page_title(),
      description: m.staff_user_page_description(),
      noindex: true,
    }),
  notFoundComponent: () => (
    <EmptyState
      title={m.not_found_title()}
      description={m.staff_error_user_not_found()}
    >
      <PillButton to="/administrator/users" scale="lg">
        {m.staff_user_back()}
      </PillButton>
    </EmptyState>
  ),
})
