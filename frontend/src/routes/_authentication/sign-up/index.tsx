import { createFileRoute } from '@tanstack/react-router'

import { pageHead } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

/** O cadastro do dono. A tela mora em `index.lazy.tsx`; `noindex` porque ninguém procura esta página. */
export const Route = createFileRoute('/_authentication/sign-up/')({
  head: () =>
    pageHead({
      path: '/sign-up',
      title: m.auth_sign_up_page_title(),
      description: m.auth_sign_up_page_description(),
      noindex: true,
    }),
})
