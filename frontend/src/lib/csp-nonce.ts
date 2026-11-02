import { createIsomorphicFn } from '@tanstack/react-start'

import * as server from './csp-nonce.server'

/**
 * O `nonce` desta resposta: do `AsyncLocalStorage` no servidor, e da
 * `<meta property="csp-nonce">` que o próprio servidor escreveu no navegador. É a mesma
 * `<meta>` que o router lê ao hidratar para pôr o `nonce` nos `<script>` que ele injeta.
 */
export const readNonce = createIsomorphicFn()
  .server((): string | undefined => server.currentNonce())
  .client(
    (): string | undefined =>
      document
        .querySelector('meta[property="csp-nonce"]')
        ?.getAttribute('content') ?? undefined,
  )
