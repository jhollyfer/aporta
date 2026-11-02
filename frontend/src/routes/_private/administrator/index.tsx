import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * `/administrator` não é uma tela: a fila de anúncios é a porta de entrada do painel, e o
 * redirecionamento faz o endereço curto (o que se digita ou se cola) cair nela.
 */
export const Route = createFileRoute('/_private/administrator/')({
  beforeLoad: () => {
    throw redirect({ to: '/administrator/listings' })
  },
})
