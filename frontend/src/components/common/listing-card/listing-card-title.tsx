import * as React from 'react'

import { useListingCard } from './listing-card-context'

export function ListingCardTitle(): React.JSX.Element {
  const { listing } = useListingCard()

  return (
    <h3 className="line-clamp-2 text-base font-bold leading-snug text-ink">
      {listing.title}
    </h3>
  )
}
