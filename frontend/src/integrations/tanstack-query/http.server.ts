/**
 * A parte do `request` que só existe no servidor de SSR.
 *
 * Com SSR, a primeira navegação é renderizada pelo Nitro, e é ele, não o
 * navegador, quem fala com o AdonisJS. Este módulo nunca entra no bundle do
 * navegador: quem o consome é o `.server()` de um `createIsomorphicFn` em
 * `http.ts`, e o plugin do Start remove a chamada e este import do build do
 * cliente.
 */

import { env } from '#/env'

/**
 * A raiz da API para quem pede **do servidor**.
 *
 * `VITE_API_URL` é o endereço público, o que o navegador alcança. O Nitro, porém,
 * costuma estar na mesma rede da API, e obrigá-lo a usar o endereço público faz o
 * pedido sair para a internet e voltar (DNS, TLS, proxy de borda) para falar com
 * um serviço vizinho: numa primeira navegação, isso é a maior parte do tempo. A
 * `SERVER_API_URL` é a saída; ausente, o servidor usa o endereço público.
 */
export function apiUrl(): string {
  return env.SERVER_API_URL ?? env.VITE_API_URL
}
