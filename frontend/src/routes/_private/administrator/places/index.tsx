import { createFileRoute } from '@tanstack/react-router'

import { administratorPlacesQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { pageHead } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

import { placesSearchSchema, toPlacesParams } from './-search'

/**
 * A lista do guia da cidade para a equipe. Aba, arquivados, busca e página moram na URL
 * (`validateSearch`) e vão para a API, que filtra e pagina: entram em `loaderDeps` e na chave de
 * cache. Roda no navegador, como toda a área privada (`ssr: false` do `_private`).
 */
export const Route = createFileRoute('/_private/administrator/places/')({
  validateSearch: placesSearchSchema,
  loaderDeps: ({ search }) => toPlacesParams(search),
  loader: ({ context, deps }) =>
    context.queryClient.query(administratorPlacesQueryOptions(deps)),
  head: () =>
    pageHead({
      path: '/administrator/places',
      title: m.staff_places_page_title(),
      description: m.staff_places_page_description(),
      noindex: true,
    }),
})
