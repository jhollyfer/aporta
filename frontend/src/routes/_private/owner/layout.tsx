import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { USER_ROLE } from '@aporta/shared'

/**
 * O guard de capacidade da área do dono (`_standards/frontend.md` §3.4): o `_private`
 * garante a sessão, e este layout garante o papel. Rota nova dentro de `owner/` nasce
 * coberta por estar aqui.
 *
 * É conforto de navegação, não segurança: quem de fato recusa o administrador e o
 * moderador é o `middleware.role([OWNER])` da API (`backend/start/routes.ts`), que responde
 * 403 a qualquer chamada. Aqui só se poupa a pessoa de ver uma tela que não vai funcionar,
 * levando-a à conta, que todo papel abre.
 */
export const Route = createFileRoute('/_private/owner')({
  beforeLoad: ({ context }) => {
    if (context.account.role !== USER_ROLE.OWNER) {
      throw redirect({ to: '/account' })
    }
  },
  component: Outlet,
})
