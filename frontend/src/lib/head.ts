import type { ListingType } from '@aporta/shared'

import { alternateLinks, localizedUrl } from './i18n'
import { SITE_TITLE, absoluteUrl } from './site'

/** A prévia padrão de link: a panorâmica do rio (`scripts/generate-og.mjs`). */
export const DEFAULT_OG_IMAGE = '/og-image.png'

/**
 * A prévia do link de um anúncio: a cena da fachada do tipo, a mesma que o card desenha
 * quando o dono não enviou foto. Nunca a foto do dono, que mora em bucket privado: uma prévia
 * pública dela vazaria o que ele não escolheu publicar. Os arquivos saem de
 * `scripts/generate-og.mjs`, e `head.test.ts` confere que cada um existe em `public/`.
 */
export const OG_IMAGE_BY_TYPE: Record<ListingType, string> = {
  HOUSE: '/og-house.png',
  ROOM: '/og-house.png',
  KITNET: '/og-building.png',
  APARTMENT: '/og-building.png',
  HOTEL: '/og-hotel.png',
}

/**
 * O `head` de uma página pública. A montagem mora aqui porque o site fala três
 * línguas e cada página precisa do canônico no idioma dela e de um `hreflang`
 * por idioma: copiar isso em cada rota é o que faz uma delas esquecer o
 * `x-default`.
 */
export type PageHead = {
  /** O caminho interno, sem prefixo de idioma. */
  path: string
  /** O título da página, sem o nome do site. `null` é a home. */
  title: string | null
  description: string
  /** A prévia do link, quando não é a padrão do site: caminho de `public/`, sem domínio. */
  image?: string
  /** Página que não deve aparecer na busca: o 404. */
  noindex?: boolean
}

type HeadEntries = Array<Record<string, string>>

function fullTitle(title: string | null): string {
  if (title === null) return SITE_TITLE
  return `${title} · ${SITE_TITLE}`
}

export function pageHead({
  path,
  title,
  description,
  image,
  noindex = false,
}: PageHead): { meta: HeadEntries; links: HeadEntries } {
  const url = localizedUrl(path)
  const heading = fullTitle(title)

  const meta: HeadEntries = [
    { title: heading },
    { name: 'description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: heading },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { name: 'twitter:title', content: heading },
    { name: 'twitter:description', content: description },
  ]

  if (image !== undefined) {
    meta.push(
      { property: 'og:image', content: absoluteUrl(image) },
      { name: 'twitter:image', content: absoluteUrl(image) },
    )
  }

  if (noindex) meta.push({ name: 'robots', content: 'noindex' })

  return {
    meta,
    links: [{ rel: 'canonical', href: url }, ...alternateLinks(path)],
  }
}
