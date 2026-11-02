import { createFileRoute } from '@tanstack/react-router'

import { guideSearchSchema, toPlaceParams } from './-search'
import { storefrontPlacesQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { pageHead } from '#/lib/head'
import { m } from '#/paraglide/messages'

export const Route = createFileRoute('/_public/guide/')({
  validateSearch: guideSearchSchema,
  loaderDeps: ({ search }) => ({ category: search.category }),
  loader: ({ context, deps }) =>
    context.queryClient.query({
      ...storefrontPlacesQueryOptions(toPlaceParams(deps.category)),
      staleTime: 'static',
    }),
  head: () =>
    pageHead({
      path: '/guide',
      title: m.guide_page_title(),
      description: m.guide_page_description(),
    }),
})
