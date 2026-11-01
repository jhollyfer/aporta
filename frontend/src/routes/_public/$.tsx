import { createFileRoute } from '@tanstack/react-router'

import { NotFoundPage } from '#/components/common/not-found-page'
import { SITE_TITLE } from '#/lib/site'
import { m } from '#/paraglide/messages'

/**
 * O endereço público que não existe. O `defaultNotFoundComponent` do router
 * desenha a mesma tela, mas fora de qualquer casca; esta rota-curinga traz a tela
 * para dentro do `_public`, com menu e rodapé. Sem `.lazy`: dividi-la custaria
 * uma ida ao servidor para carregar seis linhas. `noindex` porque o endereço não
 * existe, e sem ele o buscador guardaria a URL errada com resposta de sucesso.
 */
export const Route = createFileRoute('/_public/$')({
  head: () => ({
    meta: [
      { title: `${m.not_found_title()} · ${SITE_TITLE}` },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: () => <NotFoundPage />,
})
