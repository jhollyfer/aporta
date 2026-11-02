import { createFileRoute } from '@tanstack/react-router'

import { administratorReportsQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { pageHead } from '#/lib/head'
import { m } from '#/paraglide/messages'

import { reportsSearchSchema, toReportParams } from './-search'

/** A fila de denúncias. Estado e página na URL, como a fila de anúncios. */
export const Route = createFileRoute('/_private/administrator/reports/')({
  validateSearch: reportsSearchSchema,
  loaderDeps: ({ search }) => toReportParams(search),
  loader: ({ context, deps }) =>
    context.queryClient.query(administratorReportsQueryOptions(deps)),
  head: () =>
    pageHead({
      path: '/administrator/reports',
      title: m.staff_reports_page_title(),
      description: m.staff_reports_page_description(),
      noindex: true,
    }),
})
