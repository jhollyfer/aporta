import { createFileRoute } from '@tanstack/react-router'

import { pageHead } from '#/lib/head'
import { m } from '#/paraglide/messages'

/** A home: os dois caminhos (procuro, anuncio), a busca e os imóveis disponíveis agora. */
export const Route = createFileRoute('/_public/')({
  head: () =>
    pageHead({
      path: '/',
      title: null,
      description: m.meta_description(),
    }),
})
