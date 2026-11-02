import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { ActionButton } from '#/components/common/action-button'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useSessionSignOutMutation } from '#/integrations/tanstack-query/mutations/authentication'
import { clearSessionHint } from '#/lib/session-hint'
import { m } from '#/paraglide/messages'

/**
 * Sair: encerra a sessão no servidor, apaga a dica, a sessão e os anúncios do dono do cache, e volta para a
 * home.
 *
 * `onSettled` e não `onSuccess`: se o token de acesso já venceu, o endpoint responde 401
 * e a sessão morre do mesmo jeito. Limpar só no sucesso deixaria o nome da pessoa
 * anterior no cabeçalho de quem entrar depois.
 *
 * A ordem é a dica, a navegação e o cache. Sem a dica o portão já recusa o `_private`, então
 * navegar antes de limpar o cache não deixa passar ninguém; e remover o cache **depois** de
 * sair da tela evita que o `useSuspenseQuery` desta página, ainda montada, refaça
 * `GET /account` e tome um 401 sem necessidade.
 */
export function SignOutButton(): React.JSX.Element {
  const router = useRouter()
  const queryClient = useQueryClient()

  const signOut = useSessionSignOutMutation({
    async onSettled() {
      clearSessionHint()
      await router.navigate({ to: '/' })
      queryClient.removeQueries({ queryKey: queryKeys.account.profile.all })
      // Os anúncios são da conta que saiu: quem entrar depois neste navegador não pode
      // ver a lista dela por até um minuto de cache.
      queryClient.removeQueries({ queryKey: queryKeys.owner.listings.all })
    },
  })

  return (
    <ActionButton
      tone="outline"
      scale="lg"
      pending={signOut.isPending}
      onClick={() => signOut.mutate()}
    >
      {m.account_sign_out()}
    </ActionButton>
  )
}
