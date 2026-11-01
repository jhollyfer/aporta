import { createContext, use } from 'react'

import type { Listing } from '@aporta/shared'

export type ListingCardContextValue = {
  listing: Listing
}

export const ListingCardContext = createContext<ListingCardContextValue | null>(
  null,
)

/**
 * As partes do card leem o anúncio daqui, e não de prop: o card tem seis
 * partes e todas precisam do mesmo anúncio. Passar `listing` a cada uma é o
 * defeito de props excessivas que o compound component existe para evitar.
 */
export function useListingCard(): ListingCardContextValue {
  const value = use(ListingCardContext)
  if (value === null) {
    throw new Error('ListingCard.* só funciona dentro de <ListingCard>')
  }
  return value
}
