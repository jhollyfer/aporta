import { createContext, use } from 'react'

import type {
  StorefrontListingPinResponse,
  StorefrontListingShowResponse,
} from '@aporta/shared'

import type { HTTPError } from '#/integrations/tanstack-query/http'
import type { MapWindow } from '#/lib/listing-map'

export type ListingMapContextValue = {
  /** Os cards da página atual: o que o toque no pin seleciona, quando o anúncio está nela. */
  cards: ReadonlyArray<StorefrontListingShowResponse>
  /** Muda quando o filtro muda (e só então): é o que manda o mapa reenquadrar nos cards. */
  fitKey: string
  activeSlug: string | null
  onSelect: (slug: string | null) => void
  /** Os pins da janela visível. Vazio até a primeira janela existir. */
  pins: ReadonlyArray<StorefrontListingPinResponse>
  /** Quantos anúncios casam na janela, o que pode ser mais que `pins.length`. */
  total: number
  /** A janela já foi medida e a consulta terminou (com ou sem pin). */
  ready: boolean
  error: HTTPError | null
  onRetry: () => void
  onWindowChange: (window: MapWindow) => void
}

export const ListingMapContext = createContext<ListingMapContextValue | null>(
  null,
)

export function useListingMap(): ListingMapContextValue {
  const value = use(ListingMapContext)
  if (value === null) {
    throw new Error('ListingMap.* só funciona dentro de <ListingMap>')
  }
  return value
}
