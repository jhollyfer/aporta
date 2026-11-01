import * as React from 'react'

import { PHOTO_ENVIRONMENT_LABELS } from '#/lib/labels'
import { cn } from '#/lib/cn'

import { useGallery } from './gallery-context'

/** Abas por ambiente: só os que o anúncio tem foto, na ordem em que aparecem. */
export function GalleryTabs(): React.JSX.Element {
  const { listing, index, jumpTo } = useGallery()
  const current = listing.photos[index]?.environment
  const environments = [...new Set(listing.photos.map((p) => p.environment))]

  return (
    <div role="tablist" className="rail flex gap-2 overflow-x-auto">
      {environments.map((environment) => (
        <button
          key={environment}
          type="button"
          role="tab"
          aria-selected={environment === current}
          onClick={() => jumpTo(environment)}
          className={cn(
            'shrink-0 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-soft',
            environment === current && 'border-moss bg-moss text-paper',
          )}
        >
          {PHOTO_ENVIRONMENT_LABELS[environment]()}
        </button>
      ))}
    </div>
  )
}
