import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import { ogLocale } from '#/lib/i18n'
import { SITE_TITLE } from '#/lib/site'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

/** O que toda rota enxerga em `context`. `type` e não `interface`: é declaração local. */
type RouterContext = {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: m.meta_title() },
      /*
       * Sem `description` o buscador monta o resumo com o que achar na página.
       * Rota que queira a sua a escreve no próprio `head`: o mais fundo vence
       * na fusão por nome.
       */
      { name: 'description', content: m.meta_description() },
      { name: 'robots', content: 'index, follow' },
      { property: 'og:site_name', content: SITE_TITLE },
      { property: 'og:locale', content: ogLocale() },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    // `lang` do Paraglide e não literal: o site fala três línguas, e o leitor de
    // tela e o buscador precisam saber qual é a desta resposta.
    <html lang={getLocale()}>
      <head>
        {/*
          A cor da barra do sistema no celular, uma por tema. Aqui e não no
          `head` da rota: a fusão de `meta` desduplica por `name`, e o par
          claro e escuro tem o mesmo `name`. Os valores são os `--paper` de
          `styles.css`.
        */}
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#f3f5f0"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#14201a"
        />
        <HeadContent />
      </head>
      <body>
        {children}
        {/* Só em desenvolvimento: sem a guarda o botão flutuante apareceria sobre o site em produção. */}
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}
