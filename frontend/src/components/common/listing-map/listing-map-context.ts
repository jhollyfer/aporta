import { createContext, use } from 'react'

import type { StorefrontListingShowResponse } from '@aporta/shared'

export type ListingMapContextValue = {
  listings: ReadonlyArray<StorefrontListingShowResponse>
  activeSlug: string | null
  onSelect: (slug: string | null) => void
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
