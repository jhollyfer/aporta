import { QueryClient } from '@tanstack/react-query'

/**
 * O `QueryClient` que vai para o contexto do router.
 *
 * O site não lê API nenhuma hoje - projetos, artigos e time são conteúdo em
 * `lib/` -, e o client existe mesmo assim porque é a peça que o padrão dos
 * quatro projetos pressupõe: `createRootRouteWithContext<{ queryClient }>` na
 * raiz e a integração de SSR em `router.tsx`. O dia em que o diário passar a
 * vir de um backend, a chave e o `loader` entram sem mexer na casca.
 *
 * Um por requisição, e nunca singleton de módulo: no servidor o módulo é
 * compartilhado por todos os visitantes, e um cache de módulo entregaria o dado
 * de um para o próximo.
 */
export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Com o default `0` todo dado que veio pronto do servidor nasce velho e
        // é refeito na hidratação.
        staleTime: 60 * 1000,
      },
    },
  })

  return {
    queryClient,
  }
}
