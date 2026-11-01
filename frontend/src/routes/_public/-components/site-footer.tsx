import * as React from 'react'
import { Link } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'

/**
 * O rodapé fecha a página com o nome grande e os caminhos, não com um mapa do
 * site. O ano é o do build do servidor, e não `new Date()` no render: o
 * navegador de quem vira o ano na noite de 31 de dezembro hidrataria com texto
 * diferente do servidor.
 */
export function SiteFooter(): React.JSX.Element {
  return (
    <footer className="mt-24 bg-moss-deep text-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14">
        <p className="text-5xl font-extrabold tracking-tight sm:text-7xl">
          {m.brand_name()}
        </p>
        <p className="max-w-xl text-lg text-paper/90">{m.footer_tagline()}</p>
        <nav aria-label={m.footer_nav_label()}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-base font-bold">
            <li>
              <Link to="/listings" className="hover:underline">
                {m.nav_listings()}
              </Link>
            </li>
            <li>
              <Link to="/guide" className="hover:underline">
                {m.nav_guide()}
              </Link>
            </li>
            <li>
              <Link to="/list-your-place" className="hover:underline">
                {m.nav_list_your_place()}
              </Link>
            </li>
          </ul>
        </nav>
        <p className="text-sm text-paper/80">{m.footer_credit()}</p>
      </div>
    </footer>
  )
}
