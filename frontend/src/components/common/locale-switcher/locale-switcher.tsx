import * as React from 'react'

import { Button } from '#/components/ui/button'
import { m } from '#/paraglide/messages'
import { getLocale, locales, setLocale } from '#/paraglide/runtime'
import { cn } from '#/lib/cn'

/**
 * O seletor de idioma. O código do idioma é o rótulo (PT, EN, ES) e o nome
 * completo vai no `aria-label`, porque a barra do celular não comporta o nome.
 * `setLocale` recarrega a página no endereço do outro idioma, que é o que o
 * Paraglide faz com a estratégia `url`.
 */
export function LocaleSwitcher(): React.JSX.Element {
  const current = getLocale()

  return (
    <div
      role="group"
      aria-label={m.locale_switcher_label()}
      className="ml-1 flex rounded-full bg-moss-wash p-0.5"
    >
      {locales.map((locale) => (
        <Button
          variant="ghost"
          key={locale}
          type="button"
          onClick={() => void setLocale(locale)}
          aria-pressed={locale === current}
          className={cn(
            'h-11 min-w-11 rounded-full px-2.5 text-xs font-extrabold text-moss-deep sm:h-8 sm:min-w-0',
            locale === current &&
              'bg-moss text-paper hover:bg-moss hover:text-paper',
          )}
        >
          {locale.slice(0, 2).toUpperCase()}
        </Button>
      ))}
    </div>
  )
}
