/**
 * O espelho, no frontend, do `HTTPException` do backend: o mesmo corpo, os
 * mesmos status, os mesmos `code`.
 *
 * Existe porque `fetch` só rejeita em falha de rede: 404, 422 e 500 chegam como
 * promessa resolvida. Sem passar por `request`, um `queryFn` trataria "anúncio não
 * encontrado" como sucesso e o corpo de erro seria lido como se fosse o anúncio.
 */

import { ErrorEnvelope } from '@aporta/shared'
import type {
  DataTag,
  QueryKey,
  UnusedSkipTokenOptions,
} from '@tanstack/react-query'
import type { Merge, z } from '@aporta/shared'
import { createIsomorphicFn } from '@tanstack/react-start'

import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

import * as server from './http.server'

import { env } from '#/env'

/**
 * O corpo de erro como vem do fio: qualquer campo pode faltar (HTML de proxy,
 * resposta vazia), e o que falta cai no padrão de `send`. O schema é o
 * `ErrorEnvelope` do `@aporta/shared`, o mesmo que o backend publica.
 */
const ERROR_BODY = ErrorEnvelope.partial()

/** Os status que o frontend distingue: só os que mudam o comportamento da tela. */
export const HTTP_STATUS = {
  /** Não houve resposta: DNS, CORS, backend fora do ar, pedido abortado. */
  NETWORK: 0,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const

/**
 * Os `code` que mudam o que a tela faz. Compare por `code`, nunca pela mensagem:
 * a mensagem é texto de interface, no idioma de quem pediu, e muda.
 */
export const HTTP_ERROR_CODE = {
  /** 404 de `GET /storefront/listings/:slug`: nenhum anúncio publicado com esse endereço. */
  LISTING_NOT_FOUND: 'LISTING_NOT_FOUND',
  /** Local, não vem do servidor: falha de rede normalizada. */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Local: resposta de erro sem corpo JSON válido (proxy, HTML de erro). */
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  /**
   * Local: resposta de sucesso cujo corpo não passa no schema `…Response`. É contrato
   * quebrado entre as duas pontas, não dado para mostrar pela metade.
   */
  INVALID_RESPONSE: 'INVALID_RESPONSE',
} as const

export class HTTPError extends Error {
  readonly status: number
  readonly code: string

  constructor(body: ErrorEnvelope) {
    super(body.message)
    this.name = 'HTTPError'
    this.status = body.status
    this.code = body.code
  }

  /** A culpa do servidor ou da rede: 5xx e o status sintético 0. */
  get isServerError(): boolean {
    return this.status >= 500 || this.status === HTTP_STATUS.NETWORK
  }
}

/**
 * Todo caminho de falha de `request` lança `HTTPError`, então o `Error` padrão da
 * biblioteca descreve mal o que chega no `error` de uma query. Com isto, `.status`
 * e `.code` ficam visíveis sem `instanceof` em cada tela.
 *
 * É promessa de compilação, não de execução: um throw que não vem de `request`
 * (um bug, um `TypeError`) ainda chega. Por isso o `retry` de `query-context.ts`
 * mantém o `instanceof`.
 */
declare module '@tanstack/react-query' {
  // module augmentation: o TypeScript exige `interface` para mesclar declaração, e
  // `type` não funciona aqui. É limite da linguagem, não estilo.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- declaration merging needs `interface`
  interface Register {
    defaultError: HTTPError
  }
}

/**
 * O que `queryOptions` devolve para uma leitura da API: as opções do `useQuery` com a
 * chave etiquetada pelo dado que ela guarda, para `getQueryData(options.queryKey)`
 * sair tipado. Escrito por extenso para cada `*QueryOptions` de `queries/` declarar o
 * tipo de retorno em vez de deixar um genérico inferido de quatro linhas.
 */
export type ResourceQueryOptions<TData, TKey extends QueryKey> = Merge<
  UnusedSkipTokenOptions<TData, HTTPError, TData, TKey>,
  { queryKey: DataTag<TKey, TData, HTTPError> }
>

/**
 * A raiz pública da API, a que o navegador de quem acessa alcança.
 *
 * Exportada porque nem tudo que aponta para ela passa por `request()`: o `src` de uma
 * imagem é o navegador buscando direto. Esses usos precisam do endereço público mesmo
 * quando o valor é montado no SSR, porque o que sai é HTML que o navegador seguirá
 * depois; por isso ficam nesta constante e não em `baseUrl()`.
 */
export const BASE_URL = env.VITE_API_URL

/**
 * A raiz da API **para quem pede agora**, que não é a mesma nos dois lados: o
 * navegador usa `VITE_API_URL`, o servidor de SSR usa `SERVER_API_URL` quando existe
 * (`http.server.ts`).
 *
 * `createIsomorphicFn` e não `typeof window`: o ramo do servidor some do bundle do
 * cliente junto com o que ele importa.
 */
const baseUrl = createIsomorphicFn()
  .client((): string => BASE_URL)
  .server(server.apiUrl)

/**
 * O prazo de um pedido à API, em milissegundos.
 *
 * O único `signal` que chegava ao `fetch` era o do TanStack Query, que aborta quando o
 * componente **desmonta**, não quando o tempo passa. Sem teto, um servidor que aceita a
 * conexão e não responde deixa a promessa pendurada até o limite do sistema operacional,
 * da ordem de minutos no Node. No navegador isso é tela congelada; no SSR é pior: o
 * `loader` roda dentro do ciclo do Nitro, então o HTML inteiro fica esperando.
 *
 * 15s é folgado de propósito: o número não existe para apertar o caso comum, e sim a
 * patologia. O ritmo normal quem impõe é o `retry` de `query-context.ts`.
 */
const TIMEOUT = 15_000

/**
 * O `signal` de quem chamou mais o prazo; o primeiro a abortar vale. `AbortSignal.any`
 * e não um `AbortController` à mão: os dois motivos (o componente desmontou, o tempo
 * acabou) são independentes e qualquer um deve valer.
 */
function deadline(signal?: AbortSignal | null): AbortSignal {
  const timeout = AbortSignal.timeout(TIMEOUT)

  if (!signal) return timeout

  return AbortSignal.any([signal, timeout])
}

/**
 * `fetch` com uma garantia a mais: resposta de erro vira exceção. Todo caminho de
 * falha (rede, corpo ilegível, erro da API) sai daqui como `HTTPError` com `status`
 * preenchido, então quem trata nunca precisa de `instanceof`.
 *
 * Sem cookie e sem credencial: a leitura pública não tem sessão, e o navegador não
 * manda cookie entre origens por padrão, que é o que se quer.
 */
async function send(path: string, init?: RequestInit): Promise<Response> {
  let response: Response

  try {
    response = await fetch(new URL(path, baseUrl()), {
      ...init,
      // Depois do spread de `init`, senão o `signal` de quem chamou sobrescreveria o
      // prazo e o pedido voltaria a não ter teto.
      signal: deadline(init?.signal),
      headers: {
        // A API responde a mensagem de erro no idioma da tela. Cabeçalho seguro para
        // CORS: não custa preflight.
        'Accept-Language': getLocale(),
        ...init?.headers,
      },
    })
  } catch {
    // `fetch` só rejeita aqui: não houve resposta, logo não há status de verdade.
    throw new HTTPError({
      message: m.http_network_error(),
      status: HTTP_STATUS.NETWORK,
      code: HTTP_ERROR_CODE.NETWORK_ERROR,
    })
  }

  if (!response.ok) {
    // Corpo ilegível (HTML de proxy, resposta vazia) também vira HTTPError com o
    // status real: a tela nunca recebe um erro sem `status`.
    let raw: unknown = null

    try {
      raw = await response.json()
    } catch {
      raw = null
    }

    const body = ERROR_BODY.safeParse(raw).data

    throw new HTTPError({
      message: body?.message ?? m.http_unexpected_error(),
      status: body?.status ?? response.status,
      code: body?.code ?? HTTP_ERROR_CODE.UNKNOWN_ERROR,
    })
  }

  return response
}

/**
 * A chamada que devolve corpo. O corpo chega `unknown` e vira tipo **aqui**, pelo
 * schema `…Response` do `@aporta/shared` que quem chama passa, o mesmo que o backend
 * publica no OpenAPI. É o único ponto do frontend em que um corpo de resposta ganha
 * tipo: `request<T>()` com `T` escolhido por quem chama seria o `as` com outro nome.
 *
 * `safeParse` e não `parse`: corpo fora do contrato sai como `HTTPError`, como todo
 * outro caminho de falha, e não como um `ZodError` que nenhuma tela trata
 * (_doc-lib/zod.md#basics, https://zod.dev/basics).
 */
export async function request<TSchema extends z.ZodType>(
  schema: TSchema,
  path: string,
  init?: RequestInit,
): Promise<z.output<TSchema>> {
  const response = await send(path, init)

  let raw: unknown = null

  try {
    raw = await response.json()
  } catch {
    raw = null
  }

  const parsed = schema.safeParse(raw)

  if (parsed.success) return parsed.data

  throw new HTTPError({
    message: m.http_invalid_response(),
    status: response.status,
    code: HTTP_ERROR_CODE.INVALID_RESPONSE,
  })
}
