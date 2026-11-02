import { createFileRoute } from '@tanstack/react-router'

import { pageHead } from '#/lib/head'
import { m } from '#/paraglide/messages'

/** A entrada do dono. A tela mora em `index.lazy.tsx`; `noindex` porque ninguém procura esta página. */
export const Route = createFileRoute('/_authentication/sign-in/')({
  head: () =>
    pageHead({
      path: '/sign-in',
      title: m.auth_sign_in_page_title(),
      description: m.auth_sign_in_page_description(),
      noindex: true,
    }),
})
