import * as React from 'react'
import { Link } from '@tanstack/react-router'

import { LocaleSwitcher } from '#/components/common/locale-switcher'
import { m } from '#/paraglide/messages'

/** O alvo do "pular para o conteúdo". */
const MAIN_ID = 'conteudo'

/**
 * A casca enxuta das telas da conta (entrar, criar conta, minha conta): o nome do
 * site levando para a home, o idioma e o conteúdo. Sem o menu da vitrine: quem está
 * entrando ou cadastrando tem uma tarefa só, e cada link a mais é uma saída do
 * formulário. O nome do site é o caminho de volta.
 *
 * Mora em `components/common/` porque as duas áreas, `_authentication` e `_private`,
 * a usam, e o ancestral comum delas é `routes/`.
 */
export function AccountShell({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <a
        href={`#${MAIN_ID}`}
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[70] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        {m.a11y_skip_to_content()}
      </a>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center text-xl font-extrabold tracking-tight text-moss"
        >
          {m.brand_name()}
        </Link>
        <LocaleSwitcher />
      </header>
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16 outline-none sm:pt-12"
      >
        {children}
      </main>
    </div>
  )
}
