import * as React from 'react'

import { ListingPhoto } from '#/components/common/listing-photo'
import { PHOTO_ENVIRONMENT_LABELS } from '#/lib/labels'
import { cn } from '#/lib/cn'

import { useGallery } from './gallery-context'

export function GalleryThumbs(): React.JSX.Element {
  const { listing, index, setIndex } = useGallery()

  return (
    <ul className="rail flex gap-2 overflow-x-auto">
      {listing.photos.map((photo, position) => (
        <li key={photo.id} className="shrink-0">
          <button
            type="button"
            onClick={() => setIndex(position)}
            aria-label={PHOTO_ENVIRONMENT_LABELS[photo.environment]()}
            aria-current={position === index && 'true'}
            className={cn(
              'block h-16 w-24 overflow-hidden rounded-xl border-2 border-transparent',
              position === index && 'border-moss',
            )}
          >
            <ListingPhoto
              photo={photo}
              listingType={listing.type}
              title={listing.title}
            />
          </button>
        </li>
      ))}
    </ul>
  )
}
