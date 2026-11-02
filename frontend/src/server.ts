/**
 * A entrada do servidor, embrulhada pelo middleware do paraglide.
 *
 * Os irmãos não têm este arquivo porque o paraglide deles está instalado e sem
 * uso. Aqui o idioma de cada requisição é resolvido antes de qualquer
 * renderização: o middleware lê o prefixo da URL e guarda o resultado num
 * escopo por requisição, que é o que o `getLocale()` do SSR enxerga. Sem isto
 * o servidor renderizaria tudo em português e o navegador trocaria o texto na
 * hidratação.
 *
 * A requisição original segue para o handler, e não a que o middleware
 * devolve: quem tira o prefixo do caminho para casar a rota é o `rewrite` do
 * `router.tsx`, e tirá-lo aqui também faria o router perder o idioma.
 *
 * Também é aqui que o HTML ganha o `Content-Security-Policy` e o `Cache-Control`, os dois
 * únicos cabeçalhos que dependem da resposta: o CSP leva um `nonce` novo por requisição
 * (que o Start repete nos `<script>` da hidratação, por `csp-nonce.server.ts`), e o
 * `no-cache` só vale para HTML. Os cabeçalhos fixos e o cache dos ativos com hash são
 * `routeRules` do Nitro (`vite.config.ts`). Só em produção: o `vite dev` injeta scripts em
 * linha que um CSP estrito derrubaria.
 *
 * O arquivo é detectado pelo nome, sem registro em lugar nenhum.
 */
import handler from '@tanstack/react-start/server-entry'

import { env } from './env'
import { createNonce, runWithNonce } from './lib/csp-nonce.server'
import { buildContentSecurityPolicy } from './lib/security-headers'
import { paraglideMiddleware } from './paraglide/server'

const API_ORIGIN = new URL(env.VITE_API_URL).origin

function storageOrigin(): string | undefined {
  if (env.STORAGE_PUBLIC_URL === undefined) return undefined

  return new URL(env.STORAGE_PUBLIC_URL).origin
}

/** Só o HTML leva política de página: JSON, XML e texto não executam script. */
function isHtml(response: Response): boolean {
  return response.headers.get('Content-Type')?.includes('text/html') ?? false
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (!import.meta.env.PROD) {
      return paraglideMiddleware(request, () => handler.fetch(request))
    }

    const nonce = createNonce()
    const response = await runWithNonce(nonce, () =>
      paraglideMiddleware(request, () => handler.fetch(request)),
    )

    if (!isHtml(response)) return response

    // Cópia, não `response.headers.set`: os cabeçalhos de uma resposta do `fetch` interno
    // podem ser imutáveis. O corpo passa adiante como está, sem ler, para o streaming do SSR
    // continuar saindo aos pedaços.
    const headers = new Headers(response.headers)

    headers.set(
      'Content-Security-Policy',
      buildContentSecurityPolicy({
        nonce,
        apiOrigin: API_ORIGIN,
        storageOrigin: storageOrigin(),
      }),
    )
    if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-cache')

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  },
}
