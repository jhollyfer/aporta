/**
 * A parte do `request` que só existe no servidor de SSR.
 *
 * Com SSR, a primeira navegação é renderizada pelo Nitro, e é ele, não o
 * navegador, quem fala com o AdonisJS. Este módulo nunca entra no bundle do
 * navegador: quem o consome é o `.server()` de um `createIsomorphicFn` em
 * `http.ts`, e o plugin do Start remove a chamada e este import do build do
 * cliente.
 */

import { getRequestHeader, getRequestIP } from '@tanstack/react-start/server'

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

/**
 * Quem pediu a página, repassado à API.
 *
 * Sem isto todo pedido do SSR chega à API com o IP do Nitro, e os limites por IP
 * (`storefrontReadThrottle`, `signInThrottle`) viram um balde só para o site inteiro: 120
 * leituras por minuto somadas entre todos os visitantes. O `X-Forwarded-For` que o proxy
 * de borda pôs na requisição do navegador segue adiante; sem proxy (desenvolvimento), cai
 * no endereço da conexão. A API só acredita no cabeçalho de um vizinho confiável
 * (`TRUSTED_PROXIES`, que precisa cobrir a rede do Nitro), nunca do cliente.
 *
 * Fora de uma requisição (um `loader` chamado em teste, por exemplo) não há quem repassar,
 * e o pedido segue sem o cabeçalho.
 */
export function clientHeaders(): Record<string, string> {
  try {
    const forwarded = getRequestHeader('x-forwarded-for')
    const address = forwarded ?? getRequestIP()

    if (address === undefined || address === '') return {}

    return { 'X-Forwarded-For': address }
  } catch {
    return {}
  }
}
