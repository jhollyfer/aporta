import * as React from 'react'
import type { AccountProfileShowResponse } from '@aporta/shared'
import { useQuery } from '@tanstack/react-query'

import { accountOptions } from '#/integrations/tanstack-query/queries/account'
import { hasSessionHint, subscribeSessionHint } from '#/lib/session-hint'

/**
 * Quem está logado, para tela pública que só quer saber se mostra "Entrar" ou
 * "Minha conta" (o cabeçalho, o guard de hidratação do `_authentication`).
 *
 * Não suspende: a página pública nunca espera pela sessão. `account` é `undefined` no
 * servidor, no primeiro quadro do navegador e enquanto a consulta não responde, então o
 * HTML de SSR é igual para todo visitante e a hidratação não diverge. A troca acontece
 * depois, no navegador.
 *
 * A consulta só roda quando há dica de sessão neste navegador (`lib/session-hint.ts`):
 * sem ela, todo visitante anônimo de toda página tomaria um 401 e tentaria um
 * `refresh`. `getServerSnapshot` devolve `false` pelo mesmo motivo do SSR: o servidor
 * não tem `localStorage`.
 */
export function useSession(): {
  account: AccountProfileShowResponse | undefined
} {
  const hinted = React.useSyncExternalStore(
    subscribeSessionHint,
    hasSessionHint,
    () => false,
  )
  const query = useQuery({ ...accountOptions(), enabled: hinted })

  // Sem dica, o que sobrou no cache é de uma sessão que acabou.
  if (!hinted) return { account: undefined }

  return { account: query.data }
}
