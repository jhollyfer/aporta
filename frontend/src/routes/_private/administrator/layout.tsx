import * as React from 'react'
import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { STAFF_USER_ROLES, USER_ROLE } from '@aporta/shared'

import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

/**
 * O guard de capacidade do painel da equipe (`_standards/frontend.md` §3.4): o `_private`
 * garante a sessão, e este layout garante o papel. Rota nova dentro de `administrator/`
 * nasce coberta por estar aqui.
 *
 * Aceita `ADMINISTRATOR` e `MODERATOR` (`STAFF_USER_ROLES`), a mesma lista que o
 * `middleware.role` da API usa. O dono vai para a conta, que todo papel abre. É conforto de
 * navegação, não segurança: quem recusa de fato é a API, que responde 403 a qualquer
 * chamada de quem não é da equipe.
 *
 * A aba "Contas" é só do `ADMINISTRATOR` (`users/layout.tsx` tem o guard da rota e a API tem o
 * `middleware.role`): o moderador nem a vê.
 */
export const Route = createFileRoute('/_private/administrator')({
  beforeLoad: ({ context }) => {
    if (!STAFF_USER_ROLES.includes(context.account.role)) {
      throw redirect({ to: '/account' })
    }
  },
  component: RouteComponent,
})

const TAB =
  'inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-ink hover:bg-moss-wash [&.active]:bg-moss-wash [&.active]:text-moss-deep'

function RouteComponent(): React.JSX.Element {
  const { account } = Route.useRouteContext()

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <nav
        aria-label={m.staff_nav_label()}
        className="flex flex-wrap items-center gap-1"
      >
        <Link to="/administrator/listings" className={cn(TAB)}>
          {m.staff_nav_listings()}
        </Link>
        <Link to="/administrator/places" className={cn(TAB)}>
          {m.staff_nav_places()}
        </Link>
        <Link to="/administrator/reports" className={cn(TAB)}>
          {m.staff_nav_reports()}
        </Link>
        {account.role === USER_ROLE.ADMINISTRATOR && (
          <Link to="/administrator/users" className={cn(TAB)}>
            {m.staff_nav_users()}
          </Link>
        )}
        <Link
          to="/account"
          className={cn(TAB, 'ml-auto font-semibold text-ink-soft')}
        >
          {m.staff_nav_account()}
        </Link>
      </nav>
      <Outlet />
    </div>
  )
}
