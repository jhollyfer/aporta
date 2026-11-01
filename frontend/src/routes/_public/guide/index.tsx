import { createFileRoute } from '@tanstack/react-router'

import { guideSearchSchema } from './-search'
import { pageHead } from '#/lib/head'
import { m } from '#/paraglide/messages'

export const Route = createFileRoute('/_public/guide/')({
  validateSearch: guideSearchSchema,
  head: () =>
    pageHead({
      path: '/guide',
      title: m.guide_page_title(),
      description: m.guide_page_description(),
    }),
})
