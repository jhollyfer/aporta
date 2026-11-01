import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'

import { routeTree } from './routeTree.gen'
import { getContext } from './integrations/tanstack-query/query-context'
import { NotFoundPage } from '#/components/common/not-found-page'
import { deLocalizeUrl, localizeUrl } from '#/paraglide/runtime'

export function getRouter() {
  const context = getContext()

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
    defaultErrorComponent: ({ reset }) => (
      <NotFoundPage variant="error" onRetry={reset} />
    ),
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
