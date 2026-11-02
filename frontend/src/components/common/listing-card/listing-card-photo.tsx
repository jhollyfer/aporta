import * as React from 'react'

import { ListingPhoto } from '#/components/common/listing-photo'

import { useListingCard } from './listing-card-context'

/** Foto de capa: a primeira do anúncio, 4:3 para não pular com a rolagem. */
export function ListingCardPhoto({
  priority = false,
}: {
  priority?: boolean
}): React.JSX.Element | null {
  const { listing } = useListingCard()
  const [cover] = listing.photos
  if (cover === undefined) return null

  return (
    <div className="aspect-[4/3] overflow-hidden rounded-card bg-moss-wash">
      <ListingPhoto
        photo={cover}
        listingType={listing.type}
        title={listing.title}
        priority={priority}
        className="transition-opacity duration-150 group-hover:opacity-90 motion-reduce:transition-none"
      />
    </div>
  )
}
