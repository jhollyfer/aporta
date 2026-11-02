import * as React from 'react'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { AccountShell } from '#/components/common/account-shell'
import { readSession } from '#/lib/read-session'
import { m } from '#/paraglide/messages'

/**
 * O portão único de sessão. Mora no layout e não em cada tela porque assim rota nova
 * dentro de `_private/` nasce protegida por estar no lugar certo.
 *
 * **`ssr: false`**, e não `'data-only'` (`_standards/frontend.md` §9.2): `'data-only'`
 * roda `beforeLoad` e `loader` no servidor, e o servidor do Aporta **não recebe o cookie
 * da sessão** (a API é outro endereço e o frontend não repassa cookie no SSR). Ali o
 * portão veria sempre "sem sessão" e mandaria todo F5 para a entrada. Sem SSR, o
 * `beforeLoad` roda no navegador, onde o cookie vai junto de cada pedido. O que o servidor
 * entrega é o `pendingComponent`, que já tem a casca da página.
 * _doc-lib/tanstack-start.md#guide/selective-ssr (página oficial não conferida).
 *
 * Sem sessão, vai para `/sign-in?redirect=<caminho>`: depois de entrar a pessoa volta
 * para onde estava. O `readSession` só trata 401 e 403 como "sem sessão"; servidor fora
 * do ar sobe ao `defaultErrorComponent`, e nunca vira "deslogado".
 *
 * Aqui não há checagem de papel, de propósito: quem autoriza é o backend.
 */
export const Route = createFileRoute('/_private')({
  ssr: false,
  beforeLoad: async ({ context, location }) => {
    const account = await readSession(context.queryClient)

    if (account === undefined) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } })
    }

    // Para o contexto da rota: toda tela filha lê quem entrou sem nova consulta.
    return { account }
  },
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
  pendingComponent: PendingComponent,
  component: RouteComponent,
})

function PendingComponent(): React.JSX.Element {
  return (
    <AccountShell>
      <p role="status" className="text-base text-ink-soft">
        {m.account_loading()}
      </p>
    </AccountShell>
  )
}

function RouteComponent(): React.JSX.Element {
  return (
    <AccountShell>
      <Outlet />
    </AccountShell>
  )
}
