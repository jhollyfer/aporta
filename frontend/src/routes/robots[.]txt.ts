import { createFileRoute } from '@tanstack/react-router'

import { INDEXABLE, SITE_URL } from '#/lib/site'

/**
 * O `robots.txt`, servido por rota e não por arquivo em `public/`: o endereço do
 * sitemap é absoluto e vem do ambiente, e um arquivo estático cravaria o domínio
 * de um ambiente só. Fora de produção (`SITE_ENV`) o arquivo fecha o site inteiro com
 * `Disallow: /` e não aponta o sitemap.
 */
function robotsTxt(): string {
  if (!INDEXABLE) return 'User-agent: *\nDisallow: /\n'

  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
}

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(robotsTxt(), {
          status: 200,
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        }),
    },
  },
})
