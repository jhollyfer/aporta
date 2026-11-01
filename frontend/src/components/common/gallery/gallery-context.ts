import { createContext, use } from 'react'

import type { Listing, PhotoEnvironment } from '@aporta/shared'

export type GalleryContextValue = {
  listing: Listing
  index: number
  setIndex: (index: number) => void
  jumpTo: (environment: PhotoEnvironment) => void
}

export const GalleryContext = createContext<GalleryContextValue | null>(null)

export function useGallery(): GalleryContextValue {
  const value = use(GalleryContext)
  if (value === null) {
    throw new Error('Gallery.* só funciona dentro de <Gallery>')
  }
  return value
}
