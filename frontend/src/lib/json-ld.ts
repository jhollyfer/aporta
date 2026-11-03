import type { StorefrontListingShowResponse } from '@aporta/shared'

import { SITE_TITLE, SITE_URL, absoluteUrl } from './site'

export type JsonLd = Record<string, unknown>

/**
 * O dado estruturado de uma página, no formato de `head().scripts` do TanStack Router
 * (`type` mais `children` com o texto). O `<` sai escapado para o JSON nunca fechar a tag
 * `script` antes da hora (`_standards/frontend.md` §9.7;
 * _doc-lib/tanstack-router.md#guide/document-head-management).
 */
export function jsonLdScript(data: JsonLd): {
  type: string
  children: string
} {
  return {
    type: 'application/ld+json',
    children: JSON.stringify(data).replaceAll('<', '\\u003c'),
  }
}

/** A organização, na raiz do site. */
export function organizationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_TITLE,
    url: SITE_URL,
    logo: absoluteUrl('/icon-512.png'),
  }
}

/** A trilha do detalhe: cada item com o nome e o endereço absoluto. */
export function breadcrumbJsonLd(
  items: ReadonlyArray<{ name: string; path: string }>,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

/**
 * O anúncio como o buscador o lê: hotel é `Hotel`, o resto é `Product` com a oferta mensal.
 * Sem foto do dono e sem contato: a foto mora em bucket privado e o WhatsApp só aparece
 * ao visitante (`docs/SECURITY.md`).
 */
export function listingJsonLd(listing: StorefrontListingShowResponse): JsonLd {
  const address = {
    '@type': 'PostalAddress',
    addressLocality: listing.neighborhood.name,
    addressRegion: 'AM',
    addressCountry: 'BR',
  }

  if (listing.type === 'HOTEL') {
    return {
      '@context': 'https://schema.org',
      '@type': 'Hotel',
      name: listing.title,
      description: listing.description,
      address,
      geo: {
        '@type': 'GeoCoordinates',
        latitude: listing.lat,
        longitude: listing.lng,
      },
    }
  }

  const data: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description,
    category: listing.type,
  }

  if (listing.price.monthly !== null) {
    data['offers'] = {
      '@type': 'Offer',
      price: listing.price.monthly,
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      availabilityStarts: listing.availableFrom,
    }
  }

  return data
}
