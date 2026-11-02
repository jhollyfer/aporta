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
    <footer className="mt-24 bg-stage text-on-stage">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14">
        <p className="text-headline font-extrabold tracking-tight">
          {m.brand_name()}
        </p>
        <p className="max-w-xl text-lg text-on-stage/90">
          {m.footer_tagline()}
        </p>
        <nav aria-label={m.footer_nav_label()}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-base font-bold">
            <li>
              <Link
                to="/listings"
                className="inline-flex min-h-11 min-w-11 items-center hover:underline"
              >
                {m.nav_listings()}
              </Link>
            </li>
            <li>
              <Link
                to="/guide"
                className="inline-flex min-h-11 min-w-11 items-center hover:underline"
              >
                {m.nav_guide()}
              </Link>
            </li>
            <li>
              <Link
                to="/list-your-place"
                className="inline-flex min-h-11 min-w-11 items-center hover:underline"
              >
                {m.nav_list_your_place()}
              </Link>
            </li>
          </ul>
        </nav>
        <p className="text-sm text-on-stage/80">{m.footer_credit()}</p>
      </div>
    </footer>
  )
}
