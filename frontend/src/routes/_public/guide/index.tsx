import { createFileRoute } from '@tanstack/react-router'

import { guideSearchSchema, toPlaceParams } from './-search'
import { storefrontPlacesQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { placesJsonLd } from '#/lib/json-ld'
import { pageHead } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

export const Route = createFileRoute('/_public/guide/')({
  validateSearch: guideSearchSchema,
  loaderDeps: ({ search }) => ({ category: search.category }),
  loader: ({ context, deps }) =>
    context.queryClient.query({
      ...storefrontPlacesQueryOptions(toPlaceParams(deps.category)),
      staleTime: 'static',
    }),
  head: ({ loaderData }) => {
    const jsonLd = []
    if (loaderData !== undefined) jsonLd.push(placesJsonLd(loaderData.data))

    return pageHead({
      path: '/guide',
      title: m.guide_page_title(),
      description: m.guide_page_description(),
      jsonLd,
    })
  },
})
