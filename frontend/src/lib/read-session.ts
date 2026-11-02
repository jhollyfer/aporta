import type { AccountProfileShowResponse } from '@aporta/shared'
import type { QueryClient } from '@tanstack/react-query'

import { HTTPError, HTTP_STATUS } from '#/integrations/tanstack-query/http'
import { accountOptions } from '#/integrations/tanstack-query/queries/account'
import { hasSessionHint } from '#/lib/session-hint'

/**
 * Quem está logado, para os `beforeLoad` dos dois layouts de conta. Devolve `undefined`
 * quando **não há sessão**, e deixa subir o que não é isso.
 *
 * Sem dica (`session-hint.ts`) nem se pergunta: seria um 401 certo, e um 401 custa um
 * `refresh` que também falha. Com dica, `queryClient.query` e não `prefetchQuery`: o
 * primeiro devolve o dado e propaga o erro, o segundo engole os dois e o guard nunca
 * reprovaria.
 *
 * Só 401 e 403 são "sem sessão". Servidor fora do ar ou rede caída não são: tratar
 * 5xx como "deslogado" mandaria a pessoa à entrada com a sessão intacta, e
 * `_standards/frontend.md` §1.3 pede que ele suba ao `defaultErrorComponent`.
 */
export async function readSession(
  queryClient: QueryClient,
): Promise<AccountProfileShowResponse | undefined> {
  if (!hasSessionHint()) return undefined

  try {
    return await queryClient.query(accountOptions())
  } catch (error) {
    const unauthenticated =
      error instanceof HTTPError &&
      (error.status === HTTP_STATUS.UNAUTHORIZED ||
        error.status === HTTP_STATUS.FORBIDDEN)

    if (unauthenticated) return undefined

    throw error
  }
}
