import { StorefrontListingPaginateResponse } from '@aporta/shared'
import { createFileRoute } from '@tanstack/react-router'

import { apiUrl } from '#/integrations/tanstack-query/http.server'
import { MAX_PER_PAGE } from '#/integrations/tanstack-query/queries/storefront'
import { STATIC_ENTRIES, buildSitemap } from '#/lib/sitemap'
import type { SitemapEntry } from '#/lib/sitemap'
import { SITE_URL } from '#/lib/site'
import { locales, localizeHref } from '#/paraglide/runtime'

/**
 * Os anúncios publicados como entradas do sitemap, direto da API.
 *
 * `fetch` e não `request()`: esta rota não passa pelo cache do Query nem pelo contexto
 * do router, e roda só no servidor. Falha de rede, resposta de erro ou corpo fora do
 * contrato devolvem `null`: o sitemap sai só com as páginas fixas em vez de 500,
 * porque um sitemap incompleto o buscador aceita e um 500 ele descarta.
 *
 * Pede todos os anúncios numa página só, no teto da API: passando de 100 anúncios
 * publicados, o sitemap precisa paginar. Usa o endereço do servidor (`apiUrl`), como o
 * SSR: a API pela rede interna quando há `SERVER_API_URL`.
 */
async function listingEntries(): Promise<ReadonlyArray<SitemapEntry> | null> {
  try {
    const response = await fetch(
      new URL(`/storefront/listings?perPage=${MAX_PER_PAGE}`, apiUrl()),
      { signal: AbortSignal.timeout(10_000) },
    )
    if (!response.ok) return null

    const parsed = StorefrontListingPaginateResponse.safeParse(
      await response.json(),
    )
    if (!parsed.success) return null

    return parsed.data.data.map((listing) => ({
      path: '/listings/'.concat(listing.slug),
      lastModified: listing.owner.updatedAt,
      priority: 0.7,
    }))
  } catch {
    return null
  }
}

/**
 * O sitemap, servido em `/sitemap.xml`. Os anúncios saem da API e não de uma lista
 * escrita aqui: um anúncio publicado entra no sitemap sem commit. Cada página entra
 * uma vez por idioma, porque `/listings` e `/en/listings` são endereços diferentes
 * para o rastreador.
 */
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const listings = await listingEntries()
        const entries: ReadonlyArray<SitemapEntry> = [
          ...STATIC_ENTRIES,
          ...(listings ?? []),
        ]

        // Sitemap incompleto (a API caiu) não pode ficar uma hora em cache: o buscador guardaria
        // a versão sem os anúncios e só a veria completa na próxima janela.
        let cache = 'public, max-age=3600'
        if (listings === null) cache = 'no-store'

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
            'cache-control': cache,
          },
        })
      },
    },
  },
})
