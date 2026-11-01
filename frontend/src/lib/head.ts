import { alternateLinks, localizedUrl } from './i18n'
import { SITE_TITLE } from './site'

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

  if (noindex) meta.push({ name: 'robots', content: 'noindex' })

  return {
    meta,
    links: [{ rel: 'canonical', href: url }, ...alternateLinks(path)],
  }
}
