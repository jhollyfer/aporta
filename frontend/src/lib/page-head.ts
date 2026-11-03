import { alternateLinks, localizedUrl } from './i18n'
import { jsonLdScript } from './json-ld'
import type { JsonLd } from './json-ld'
import { SITE_TITLE, absoluteUrl } from './site'

/** A prévia de link, a mesma em todas as páginas: o nome e a cidade em tipografia (`scripts/generate-og.mjs`). Nunca foto do dono, que mora em bucket privado, nem ilustração de imóvel. */
export const DEFAULT_OG_IMAGE = '/og-image.png'

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
  /** Dados estruturados da página (JSON-LD), um script por item. */
  jsonLd?: ReadonlyArray<JsonLd>
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
  jsonLd = [],
}: PageHead): {
  meta: HeadEntries
  links: HeadEntries
  scripts: Array<{ type: string; children: string }>
} {
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
    scripts: jsonLd.map((data) => jsonLdScript(data)),
  }
}
