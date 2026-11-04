import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { USER_ROLE } from '@aporta/shared'

/**
 * O guard de capacidade da gestão de contas (`_standards/frontend.md` §3.4): o layout do painel
 * deixa entrar a equipe toda, e as contas são só do `ADMINISTRATOR`. O moderador que digitar o
 * endereço vai para a fila de anúncios, que é dele. Rota nova dentro de `users/` nasce coberta.
 *
 * É conforto de navegação, não segurança: quem de fato recusa o moderador é o
 * `middleware.role([ADMINISTRATOR])` do grupo `/administrator/users` da API, que responde 403
 * a qualquer chamada (`DECISIONS.md` #36).
 */
export const Route = createFileRoute('/_private/administrator/users')({
  beforeLoad: ({ context }) => {
    if (context.account.role !== USER_ROLE.ADMINISTRATOR) {
      throw redirect({ to: '/administrator/listings' })
    }
  },
  component: Outlet,
})
