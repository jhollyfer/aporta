import type * as React from 'react'
import { Outlet, createFileRoute } from '@tanstack/react-router'

import { SiteFooter } from './-components/site-footer'
import { SiteHeader } from './-components/site-header'
import { storefrontNeighborhoodsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { m } from '#/paraglide/messages'

/**
 * A casca pública: cabeçalho, conteúdo e rodapé. Mora aqui e não no
 * `__root.tsx` para o 404 e o erro do router, que não passam por este layout,
 * desenharem a tela sozinhos, sem menu quebrado.
 */
export const Route = createFileRoute('/_public')({
  // Os bairros alimentam a busca da home, a barra de filtros e o formulário de
  // anunciar, ou seja, quase toda página. O `loader` do layout roda em paralelo com o
  // da rota filha, então carregá-los aqui não cria cascata.
  loader: ({ context }) =>
    context.queryClient.query({
      ...storefrontNeighborhoodsQueryOptions(),
      staleTime: 'static',
    }),
  component: RouteComponent,
})

/** O alvo do "pular para o conteúdo". */
const MAIN_ID = 'conteudo'

function RouteComponent(): React.JSX.Element {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      {/*
        Primeiro elemento focável da página. `sr-only` com `focus:not-sr-only`
        e não `display: none`: escondido de verdade o link não receberia foco.
      */}
      <a
        href={`#${MAIN_ID}`}
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[70] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        {m.a11y_skip_to_content()}
      </a>
      <SiteHeader />
      <main id={MAIN_ID} tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
