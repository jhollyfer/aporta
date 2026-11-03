import { createFileRoute } from '@tanstack/react-router'

import { pageHead } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

export const Route = createFileRoute('/_public/list-your-place/')({
  head: () =>
    pageHead({
      path: '/list-your-place',
      title: m.owner_page_title(),
      description: m.owner_page_description(),
    }),
})
