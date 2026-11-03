import { createFileRoute } from '@tanstack/react-router'

import { pageHead } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

/**
 * Minha conta. O `beforeLoad` do `_private` já encheu o cache da sessão, então não
 * há `loader` aqui: o `useSuspenseQuery` da tela lê o que o portão deixou.
 */
export const Route = createFileRoute('/_private/account/')({
  head: () =>
    pageHead({
      path: '/account',
      title: m.account_page_title(),
      description: m.account_page_description(),
      noindex: true,
    }),
})
