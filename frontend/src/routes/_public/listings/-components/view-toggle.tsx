import * as React from 'react'
import { ListBullets, MapTrifold } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { m } from '#/paraglide/messages'

import { LISTINGS_VIEW } from '../-search'
import type { ListingsView } from '../-search'

type Spec = { label: () => string; Glyph: Icon }

/** O que o botão oferece é a vista que NÃO está aberta: estando na lista, "Mapa". */
const OFFER: Record<ListingsView, Spec> = {
  [LISTINGS_VIEW.LIST]: { label: () => m.view_show_map(), Glyph: MapTrifold },
  [LISTINGS_VIEW.MAP]: { label: () => m.view_show_list(), Glyph: ListBullets },
}

/**
 * O botão flutuante do rodapé que alterna lista e mapa no celular, como o
 * Airbnb faz. Some a partir do `lg`, onde os dois cabem lado a lado.
 */
export function ViewToggle({
  view,
  onToggle,
}: {
  view: ListingsView
  onToggle: () => void
}): React.JSX.Element {
  const { label, Glyph } = OFFER[view]

  return (
    <button
      type="button"
      onClick={onToggle}
      className="fixed bottom-5 left-1/2 z-40 inline-flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-6 text-sm font-extrabold text-paper shadow-xl lg:hidden"
    >
      <Glyph aria-hidden weight="bold" className="size-5" />
      {label()}
    </button>
  )
}
