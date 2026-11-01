import * as React from 'react'
import { Link } from '@tanstack/react-router'

import { LocaleSwitcher } from './locale-switcher'
import { m } from '#/paraglide/messages'

const LINK =
  'rounded-full px-3 py-2 text-sm font-bold text-ink hover:bg-moss-wash [&.active]:bg-moss-wash'

/**
 * O cabeçalho: nome, três links, idioma e uma ação. Sem barra flutuante nem
 * vidro: no celular de 360px cada pixel de altura é conteúdo a menos.
 */
export function SiteHeader(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur-none">
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
