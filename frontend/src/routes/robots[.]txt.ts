import { createFileRoute } from '@tanstack/react-router'

import { SITE_URL } from '#/lib/site'

/**
 * O `robots.txt`, servido por rota e não por arquivo em `public/`: o endereço do
 * sitemap é absoluto e vem do ambiente, e um arquivo estático cravaria o domínio
 * de um ambiente só.
 */
export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(
          `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
          {
            status: 200,
            headers: {
              'content-type': 'text/plain; charset=utf-8',
              'cache-control': 'public, max-age=3600',
            },
          },
        ),
    },
  },
})
