import * as React from 'react'

import { ListingCard } from '#/components/common/listing-card'

import { useListingMap } from './listing-map-context'

/**
 * O resumo do imóvel tocado no pin, sobre o mapa. Sem ele o pin só diz o preço,
 * e no celular o toque seguinte seria sair do mapa para descobrir de que imóvel
 * era o valor.
 */
export function ListingMapSummary(): React.JSX.Element | null {
  const { listings, activeSlug } = useListingMap()
  const listing = listings.find((item) => item.slug === activeSlug)
  if (listing === undefined) return null

  return (
    <div className="absolute inset-x-3 bottom-3 z-[500] rounded-card border border-line bg-surface p-3 shadow-xl sm:inset-x-auto sm:right-3 sm:w-72">
      <ListingCard listing={listing}>
        <ListingCard.Title />
        <ListingCard.Meta />
        <ListingCard.Price />
      </ListingCard>
    </div>
  )
}
