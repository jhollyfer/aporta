import { createFileRoute } from '@tanstack/react-router'

import { administratorUsersQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { pageHead } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

import { toUsersParams, usersSearchSchema } from './-search'

/**
 * A lista de contas para o administrador. Papel, status, busca e página moram na URL
 * (`validateSearch`) e vão para a API, que filtra e pagina: entram em `loaderDeps` e na chave de
 * cache. Roda no navegador, como toda a área privada (`ssr: false` do `_private`).
 */
export const Route = createFileRoute('/_private/administrator/users/')({
  validateSearch: usersSearchSchema,
  loaderDeps: ({ search }) => toUsersParams(search),
  loader: ({ context, deps }) =>
    context.queryClient.query(administratorUsersQueryOptions(deps)),
  head: () =>
    pageHead({
      path: '/administrator/users',
      title: m.staff_users_page_title(),
      description: m.staff_users_page_description(),
      noindex: true,
    }),
})
