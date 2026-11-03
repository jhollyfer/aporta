import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import { ogLocale } from '#/lib/i18n'
import { readNonce } from '#/lib/csp-nonce'
import { DEFAULT_OG_IMAGE } from '#/lib/page-head'
import { SITE_TITLE, absoluteUrl } from '#/lib/site'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

import appCss from '../styles.css?url'
import jakartaLatin from '@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2?url'

import type { QueryClient } from '@tanstack/react-query'

/** O que toda rota enxerga em `context`. `type` e não `interface`: é declaração local. */
type RouterContext = {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      /*
       * O `nonce` do CSP no HTML, para o router do navegador pôr o mesmo nos `<script>` que
       * injeta ao hidratar. Ausente em desenvolvimento, onde não há CSP.
       */
      ...cspNonceMeta(),
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
      /*
       * Os dois temas são desenhados (`prefers-color-scheme`): sem isto o navegador pinta o
       * fundo e a barra de rolagem de claro até o CSS chegar, e a página escura pisca branca.
       */
      { name: 'color-scheme', content: 'light dark' },
      { property: 'og:site_name', content: SITE_TITLE },
      { property: 'og:locale', content: ogLocale() },
      /*
       * A prévia padrão do link: a panorâmica do rio. A página do anúncio troca pela cena do
       * tipo (`pageHead`), e o mais fundo vence na fusão. Absoluta porque o cartão de link é
       * montado fora do site, e o crawler não resolve caminho relativo.
       */
      { property: 'og:image', content: absoluteUrl(DEFAULT_OG_IMAGE) },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: m.meta_og_image_alt() },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: absoluteUrl(DEFAULT_OG_IMAGE) },
    ],
    links: [
      /*
       * A fonte do texto da primeira pintura. O `preload` com `crossorigin` é obrigatório
       * mesmo na mesma origem (a fonte é buscada em modo CORS) e o `type` evita baixar o
       * woff2 em navegador que não o lê. Só o subconjunto latino: é o que o português, o
       * inglês e o espanhol usam, e os outros ficam para o `unicode-range` buscar se preciso.
       * O preload não bloqueia a renderização, só adianta a busca que o CSS faria depois.
       */
      {
        rel: 'preload',
        as: 'font',
        type: 'font/woff2',
        href: jakartaLatin,
        crossOrigin: 'anonymous',
      },
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
    ],
  }),
  shellComponent: RootDocument,
})

function cspNonceMeta(): Array<{ property: string; content: string }> {
  const nonce = readNonce()
  if (nonce === undefined) return []

  return [{ property: 'csp-nonce', content: nonce }]
}

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
