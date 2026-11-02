import { getRouteApi, useRouter } from '@tanstack/react-router'
import type { UseMutationResult } from '@tanstack/react-query'
import type { AuthenticationSessionSignInPayload } from '@aporta/shared'

import type {
  HTTPError,
  MutationProps,
} from '#/integrations/tanstack-query/http'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { useSessionSignInMutation } from '#/integrations/tanstack-query/mutations/authentication'
import { redirectDestination } from '#/lib/redirect-search'
import { markSessionHint } from '#/lib/session-hint'

const route = getRouteApi('/_authentication')

/**
 * Entrar e seguir para o destino. Mora num hook porque as duas telas entram: a de
 * entrada, direto, e a de cadastro, logo depois de criar a conta. Escrito duas vezes,
 * bastava uma esquecer o `markSessionHint` para a pessoa entrar e o cabeçalho continuar
 * dizendo "Entrar".
 *
 * A ordem do `onSuccess` importa:
 *
 * 1. a dica de sessão liga a consulta do cabeçalho;
 * 2. a invalidação **devolvida** mantém o botão ocupado até `GET /account` voltar, de
 *    modo que o destino já encontra o cache cheio;
 * 3. só então navega. O sign-in responde 204 e não diz quem entrou: quem diz é o
 *    `GET /account`.
 *
 * `href` e não `to`: o destino veio da URL como texto, e `to` é o campo tipado contra a
 * árvore de rotas. Já foi validado como caminho interno (`lib/redirect-search.ts`).
 */
export function useEnterSession(
  options?: Pick<
    MutationProps<void, AuthenticationSessionSignInPayload>,
    'onError'
  >,
): UseMutationResult<void, HTTPError, AuthenticationSessionSignInPayload> {
  const router = useRouter()
  const invalidate = useInvalidate()
  const search = route.useSearch()

  return useSessionSignInMutation({
    ...options,
    async onSuccess() {
      markSessionHint()
      await invalidate('account.profile')
      await router.navigate({ href: redirectDestination(search) })
    },
  })
}
