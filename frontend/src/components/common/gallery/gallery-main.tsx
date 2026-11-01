import * as React from 'react'

import { ListingPhoto } from '#/components/common/listing-photo'

import { useGallery } from './gallery-context'

/** A foto grande. A primeira é a do LCP da página, então vem sem lazy. */
export function GalleryMain(): React.JSX.Element | null {
  const { listing, index } = useGallery()
  const photo = listing.photos[index]
  if (photo === undefined) return null

  return (
    <div className="aspect-[4/3] overflow-hidden rounded-card bg-moss-wash lg:aspect-[16/10]">
      <ListingPhoto
        photo={photo}
        listingType={listing.type}
        title={listing.title}
        priority={index === 0}
      />
    </div>
  )
}
