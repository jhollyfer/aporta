import { getLocale, locales, localizeHref } from '#/paraglide/runtime'
import type { Locale } from '#/paraglide/runtime'

import { absoluteUrl } from './site'

/**
 * O idioma em formato de `og:locale`, que usa sublinhado e não hífen.
 *
 * Lookup e não `replace('-', '_')`: `en` e `es` não têm região, e o cartão de
 * link quer uma região explícita para não adivinhar.
 */
const OG_LOCALES: Record<Locale, string> = {
  'pt-BR': 'pt_BR',
  en: 'en_US',
  es: 'es_ES',
}

export function ogLocale(): string {
  return OG_LOCALES[getLocale()]
}

/**
 * O endereço absoluto de um caminho interno, no idioma pedido (ou no da
 * requisição). `localizeHref` e não concatenação de prefixo: o português é o
 * idioma base e não leva prefixo, e a regra mora no Paraglide, que é quem a
 * aplica no roteamento também.
 */
export function localizedUrl(path: string, locale?: Locale): string {
  return absoluteUrl(localizeHref(path, { locale }))
}

/**
 * Os `<link rel="alternate" hreflang>` de uma página, um por idioma e mais o
 * `x-default`. Sem eles o buscador trata `/listings` e `/en/listings` como
 * conteúdo duplicado e escolhe um sozinho.
 */
export function alternateLinks(
  path: string,
): Array<{ rel: string; hrefLang: string; href: string }> {
  const links = locales.map((locale) => ({
    rel: 'alternate',
    hrefLang: locale,
    href: localizedUrl(path, locale),
  }))

  return [
    ...links,
    {
      rel: 'alternate',
      hrefLang: 'x-default',
      href: localizedUrl(path, 'pt-BR'),
    },
  ]
}
