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
 * O arquivo é detectado pelo nome, sem registro em lugar nenhum.
 */
import handler from '@tanstack/react-start/server-entry'

import { paraglideMiddleware } from './paraglide/server'

export default {
  fetch(request: Request): Promise<Response> {
    return paraglideMiddleware(request, () => handler.fetch(request))
  },
}
