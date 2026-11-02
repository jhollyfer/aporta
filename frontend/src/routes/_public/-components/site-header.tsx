import * as React from 'react'
import { Link } from '@tanstack/react-router'

import { STAFF_USER_ROLES, USER_ROLE } from '@aporta/shared'

import { LocaleSwitcher } from '#/components/common/locale-switcher'
import { useSession } from '#/hooks/use-session'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

const LINK =
  'rounded-full px-3 py-2 text-sm font-bold text-ink hover:bg-moss-wash [&.active]:bg-moss-wash'

/**
 * O link da conta: "Entrar" para quem não tem sessão, "Minha conta" para quem tem.
 *
 * A sessão só é conhecida no navegador, depois da hidratação (`useSession`): no
 * servidor e no primeiro quadro aparece "Entrar", e a troca vem quando a consulta
 * responde. Os dois textos ficam empilhados na mesma célula da grade e o que não vale
 * é só `invisible`, então o link tem sempre a largura do maior (o idioma muda os
 * textos) e a troca não empurra o resto da barra. `invisible` tira o texto da árvore
 * de acessibilidade, e o nome do link é só o que se vê.
 */
function AccountLink(): React.JSX.Element {
  const { account } = useSession()
  const signedIn = account !== undefined
  let target: '/account' | '/sign-in' = '/sign-in'
  if (signedIn) target = '/account'

  return (
    <Link
      to={target}
      className={cn(
        LINK,
        'inline-grid min-h-11 items-center justify-items-center',
      )}
    >
      <span className={cn('col-start-1 row-start-1', signedIn && 'invisible')}>
        {m.nav_sign_in()}
      </span>
      <span className={cn('col-start-1 row-start-1', !signedIn && 'invisible')}>
        {m.nav_account()}
      </span>
    </Link>
  )
}

/**
 * "Meus anúncios", só para o dono logado. Aparece depois da hidratação, como o resto da
 * conta (`useSession`): o HTML do servidor é igual para todo visitante, e o link entra
 * quando a sessão responde. Administrador e moderador não o veem, porque a área do dono
 * não é deles.
 */
function MyListingsLink(): React.JSX.Element | null {
  const { account } = useSession()

  if (account?.role !== USER_ROLE.OWNER) return null

  return (
    <Link
      to="/owner/listings"
      className={cn(LINK, 'inline-flex min-h-11 items-center')}
    >
      {m.nav_my_listings()}
    </Link>
  )
}

/**
 * "Painel", só para a equipe logada (administrador e moderador). Mesma regra do "Meus
 * anúncios": aparece depois da hidratação, e o HTML do servidor é igual para todo visitante.
 * "Minha conta" continua ao lado: o painel é um atalho, não substitui a conta.
 */
function PanelLink(): React.JSX.Element | null {
  const { account } = useSession()

  if (account === undefined || !STAFF_USER_ROLES.includes(account.role)) {
    return null
  }

  return (
    <Link
      to="/administrator/listings"
      className={cn(LINK, 'inline-flex min-h-11 items-center')}
    >
      {m.nav_panel()}
    </Link>
  )
}

/**
 * O cabeçalho: nome, links, conta, idioma e uma ação. Sem barra flutuante nem
 * vidro: no celular de 360px cada pixel de altura é conteúdo a menos.
 */
export function SiteHeader(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 bg-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3">
        <Link
          to="/"
          className="text-xl font-extrabold tracking-tight text-moss"
        >
          {m.brand_name()}
        </Link>
        <nav
          aria-label={m.nav_label()}
          className="flex flex-wrap items-center gap-1"
        >
          <Link to="/listings" className={LINK}>
            {m.nav_listings()}
          </Link>
          <Link to="/guide" className={LINK}>
            {m.nav_guide()}
          </Link>
          <MyListingsLink />
          <PanelLink />
          <AccountLink />
          <Link
            to="/list-your-place"
            className="ml-1 hidden rounded-full bg-sun px-4 py-2 text-sm font-extrabold text-on-sun hover:bg-sun-deep sm:inline-flex"
          >
            {m.nav_list_your_place()}
          </Link>
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  )
}
