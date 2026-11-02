import * as React from 'react'
import { Bed, MapPin } from '@phosphor-icons/react'

import { m } from '#/paraglide/messages'

import { useListingCard } from './listing-card-context'

/** Bairro primeiro: é o filtro principal da cidade, então é o que o olho procura. */
export function ListingCardMeta(): React.JSX.Element {
  const { listing } = useListingCard()
  let bedrooms = m.card_bedrooms({ count: listing.bedrooms })
  if (listing.bedrooms === 1) bedrooms = m.card_bedroom_one()

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
      <span className="inline-flex items-center gap-1">
        <MapPin aria-hidden className="size-4" />
        {listing.neighborhood.name}
      </span>
      <span className="inline-flex items-center gap-1">
        <Bed aria-hidden className="size-4" />
        {bedrooms}
      </span>
    </p>
  )
}
