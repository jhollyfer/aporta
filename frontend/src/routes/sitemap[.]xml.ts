import { createFileRoute } from '@tanstack/react-router'

import { LISTINGS } from '#/lib/data/listings'
import { STATIC_ENTRIES, buildSitemap } from '#/lib/sitemap'
import type { SitemapEntry } from '#/lib/sitemap'
import { SITE_URL } from '#/lib/site'
import { locales, localizeHref } from '#/paraglide/runtime'

/**
 * O sitemap, servido em `/sitemap.xml`. Os anúncios saem do próprio registro e
 * não de uma lista escrita aqui: um anúncio novo entra no sitemap no mesmo
 * commit que o publica. Cada página entra uma vez por idioma, porque
 * `/listings` e `/en/listings` são endereços diferentes para o rastreador.
 */
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        const entries: ReadonlyArray<SitemapEntry> = [
          ...STATIC_ENTRIES,
          ...LISTINGS.map((listing) => ({
            path: '/listings/'.concat(listing.slug),
            lastModified: listing.owner.updatedAt,
            priority: 0.7,
          })),
        ]

        const localized = locales.flatMap((locale) =>
          entries.map((entry) => ({
            ...entry,
            path: localizeHref(entry.path, { locale }),
          })),
        )

        return new Response(buildSitemap(SITE_URL, localized), {
          status: 200,
          headers: {
            'content-type': 'application/xml; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        })
      },
    },
  },
})
