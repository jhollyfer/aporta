import * as React from 'react'

import { Button } from '#/components/ui/button'
import { ListingPhoto } from '#/components/common/listing-photo'
import { PHOTO_ENVIRONMENT_LABELS } from '#/lib/labels'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

import { useGallery } from './gallery-context'

/**
 * O nome do botão leva o texto que ele mostra: sem foto, o quadro neutro escreve "Foto em
 * breve", e um nome que não o contém reprova o critério 2.5.3 (rótulo no nome) do WCAG.
 */
function thumbLabel(environment: string, url: string | null): string {
  if (url !== null) return environment

  return `${environment}, ${m.photo_missing()}`
}

export function GalleryThumbs(): React.JSX.Element {
  const { listing, index, setIndex } = useGallery()

  return (
    <ul className="grid grid-cols-5 gap-2">
      {listing.photos.map((photo, position) => (
        <li key={photo.id}>
          <Button
            variant="ghost"
            type="button"
            onClick={() => setIndex(position)}
            aria-label={thumbLabel(
              PHOTO_ENVIRONMENT_LABELS[photo.environment](),
              photo.url,
            )}
            aria-current={position === index && 'true'}
            className={cn(
              'block h-auto aspect-[4/3] w-full overflow-hidden rounded-xl border-2 border-transparent p-0',
              position === index && 'border-moss',
            )}
          >
            <ListingPhoto
              photo={photo}
              listingType={listing.type}
              title={listing.title}
            />
          </Button>
        </li>
      ))}
    </ul>
  )
}
