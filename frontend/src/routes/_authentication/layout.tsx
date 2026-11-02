import * as React from 'react'
import {
  Outlet,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/react-router'

import { AccountShell } from '#/components/common/account-shell'
import { useSession } from '#/hooks/use-session'
import { readSession } from '#/lib/read-session'
import {
  redirectDestination,
  validateRedirectSearch,
} from '#/lib/redirect-search'

/**
 * A guarda inversa: quem já tem sessão não vê o formulário de entrada. Mora no layout
 * pelo mesmo motivo do `_private`: tela nova de autenticação nasce coberta por estar no
 * lugar certo.
 *
 * O `?redirect=` é validado aqui, uma vez, e as telas filhas o herdam já limpo: nenhuma
 * navegação leva a pessoa para fora do site (`lib/redirect-search.ts`).
 *
 * São duas guardas, e as duas são necessárias. O `beforeLoad` cobre a navegação dentro
 * do app. Mas a primeira carga de `/sign-in` é renderizada no servidor, que não tem o
 * cookie da pessoa, e o `beforeLoad` não roda de novo na hidratação: quem abre a tela
 * já logado a vê pronta. O efeito do componente fecha esse caso.
 */
export const Route = createFileRoute('/_authentication')({
  validateSearch: validateRedirectSearch,
  beforeLoad: async ({ context, search }) => {
    let account
    try {
      account = await readSession(context.queryClient)
    } catch {
      // Falha que não é "sem sessão" (API fora do ar): a entrada continua útil, e é
      // onde a pessoa tenta de novo. O erro aparece quando ela enviar.
      return
    }

    if (account === undefined) return

    // Fora do `try`: um `redirect` é lançado, e lançado de dentro dele seria pego pelo
    // `catch` que existe para o caso oposto, e o sintoma seria um login que aceita a
    // senha e não sai da tela.
    throw redirect({ href: redirectDestination(search) })
  },
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
  component: RouteComponent,
})

function RouteComponent(): React.JSX.Element {
  const router = useRouter()
  const search = Route.useSearch()
  const { account } = useSession()
  const signedIn = account !== undefined

  // Depois de entrar, o formulário navega para o mesmo destino: os dois usam
  // `redirectDestination`, então o segundo `navigate` cai no mesmo lugar.
  React.useEffect(() => {
    if (signedIn) void router.navigate({ href: redirectDestination(search) })
  }, [signedIn, router, search])

  return (
    <AccountShell>
      <Outlet />
    </AccountShell>
  )
}
