import { createContext, use } from 'react'

import type {
  PhotoEnvironment,
  StorefrontListingShowResponse,
} from '@aporta/shared'

export type GalleryContextValue = {
  listing: StorefrontListingShowResponse
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
