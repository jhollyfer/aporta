import { createFileRoute } from '@tanstack/react-router'

import { administratorListingsQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { pageHead } from '#/lib/head'
import { m } from '#/paraglide/messages'

import { queueSearchSchema, toQueueParams } from './-search'

/**
 * A fila de anúncios da equipe. Estado e página moram na URL (`validateSearch`) e vão para a
 * API, que filtra e pagina: entram em `loaderDeps` e na chave de cache. Roda no navegador,
 * como toda a área privada (`ssr: false` do `_private`).
 */
export const Route = createFileRoute('/_private/administrator/listings/')({
  validateSearch: queueSearchSchema,
  loaderDeps: ({ search }) => toQueueParams(search),
  loader: ({ context, deps }) =>
    context.queryClient.query(administratorListingsQueryOptions(deps)),
  head: () =>
    pageHead({
      path: '/administrator/listings',
      title: m.staff_listings_page_title(),
      description: m.staff_listings_page_description(),
      noindex: true,
    }),
})
