import * as React from 'react'

import type {
  PhotoEnvironment,
  StorefrontListingShowResponse,
} from '@aporta/shared'

import { cn } from '#/lib/cn'

import { GalleryContext } from './gallery-context'

type GalleryRootProps = {
  listing: StorefrontListingShowResponse
  className?: string
  children: React.ReactNode
}

/**
 * A galeria do detalhe: foto principal grande, miniaturas e abas por ambiente
 * (fachada, quarto, banheiro, cozinha). Anúncio que só mostra a cama é sinal de
 * alerta, então o ambiente é parte da navegação, e não só um texto na legenda.
 */
export function GalleryRoot({
  listing,
  className,
  children,
}: GalleryRootProps): React.JSX.Element {
  const [index, setIndex] = React.useState(0)

  const jumpTo = React.useCallback(
    (environment: PhotoEnvironment) => {
      const found = listing.photos.findIndex(
        (photo) => photo.environment === environment,
      )
      if (found >= 0) setIndex(found)
    },
    [listing.photos],
  )

  const value = React.useMemo(
    () => ({ listing, index, setIndex, jumpTo }),
    [listing, index, jumpTo],
  )

  return (
    <GalleryContext value={value}>
      <div className={cn('flex min-w-0 flex-col gap-3', className)}>
        {children}
      </div>
    </GalleryContext>
  )
}
