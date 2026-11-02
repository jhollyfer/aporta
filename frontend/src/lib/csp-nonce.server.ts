/**
 * O `nonce` da requisição que está sendo renderizada, só no servidor.
 *
 * O CSP vai no cabeçalho da resposta (`server.ts`) e o mesmo `nonce` precisa estar nos
 * `<script>` que o Start escreve no HTML (`router.options.ssr.nonce`, em `router.tsx`). Os
 * dois lados nascem em lugares diferentes, então o valor viaja por `AsyncLocalStorage`: um por
 * requisição, sem variável de módulo (que o Nitro compartilharia entre visitantes e entregaria
 * o `nonce` de um ao outro, anulando a proteção).
 *
 * Nunca entra no bundle do navegador: quem o consome é o `.server()` de um
 * `createIsomorphicFn` (`csp-nonce.ts`), como `http.server.ts` faz.
 */
import { AsyncLocalStorage } from 'node:async_hooks'

const store = new AsyncLocalStorage<string>()

/** Roda `work` com `nonce` visível a tudo o que ele chamar, inclusive o `getRouter` do Start. */
export function runWithNonce<T>(nonce: string, work: () => T): T {
  return store.run(nonce, work)
}

export function currentNonce(): string | undefined {
  return store.getStore()
}

/** 16 bytes aleatórios em base64: o tamanho que a especificação do CSP recomenda. */
export function createNonce(): string {
  return btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))),
  )
}
