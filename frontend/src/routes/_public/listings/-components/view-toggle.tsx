import * as React from 'react'
import { ListBullets, MapTrifold } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

import { LISTINGS_VIEW } from '../-search'
import type { ListingsView } from '../-search'

type Option = { view: ListingsView; label: () => string; Glyph: Icon }

const OPTIONS: ReadonlyArray<Option> = [
  {
    view: LISTINGS_VIEW.LIST,
    label: () => m.view_show_list(),
    Glyph: ListBullets,
  },
  {
    view: LISTINGS_VIEW.MAP,
    label: () => m.view_show_map(),
    Glyph: MapTrifold,
  },
]

/**
 * A escolha entre lista e mapa em tela estreita: dois botões lado a lado, no fluxo da página,
 * acima dos resultados, como num site (nada flutua sobre o conteúdo, nada imita barra de
 * aplicativo). Some a partir do `lg`, onde os dois cabem lado a lado.
 */
export function ViewToggle({
  view,
  onToggle,
}: {
  view: ListingsView
  onToggle: () => void
}): React.JSX.Element {
  return (
    <div
      role="group"
      aria-label={m.view_toggle_label()}
      className="flex w-fit rounded-full bg-moss-wash p-0.5 lg:hidden"
    >
      {OPTIONS.map(({ view: option, label, Glyph }) => (
        <Button
          variant="ghost"
          key={option}
          type="button"
          aria-pressed={option === view}
          onClick={() => {
            if (option !== view) onToggle()
          }}
          className={cn(
            'inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-extrabold text-moss-deep',
            option === view &&
              'bg-moss text-paper hover:bg-moss hover:text-paper',
          )}
        >
          <Glyph aria-hidden weight="bold" className="size-5" />
          {label()}
        </Button>
      ))}
    </div>
  )
}
