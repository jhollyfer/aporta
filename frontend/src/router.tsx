import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'

import { routeTree } from './routeTree.gen'
import { getContext } from './integrations/tanstack-query/query-context'
import { NotFoundPage, RouteError } from '#/components/common/not-found-page'
import { ValidationMessage } from '@aporta/shared'

import { deLocalizeUrl, getLocale, localizeUrl } from '#/paraglide/runtime'

export function getRouter() {
  const context = getContext()

  /*
   * O idioma das mensagens de validação dos formulários. Sem esta chamada o
   * Zod devolve o inglês dele ("Invalid option: expected one of..."): o
   * `@aporta/shared` é `sideEffects: false`, e o `z.config` que instala as
   * mensagens da casa mora no topo do módulo do validator, que o bundler
   * descarta quando só se importa o schema. Chamar o método da classe força a
   * inclusão e liga o idioma.
   *
   * Só no navegador: no servidor o idioma é estado de módulo compartilhado
   * entre requisições paralelas, e o formulário só mostra erro depois do
   * primeiro toque, já no cliente.
   */
  if (!import.meta.env.SSR) ValidationMessage.setLocale(getLocale())

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,

    /*
     * O idioma mora no prefixo do endereço (`/en/listings`), e as rotas não
     * sabem disso: `routes/` declara `/listings` uma vez só. A entrada tira o
     * prefixo antes de casar a rota, e a saída o devolve em todo `Link`.
     */
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
    defaultNotFoundComponent: () => <NotFoundPage />,
    defaultErrorComponent: ({ reset }) => <RouteError reset={reset} />,
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
