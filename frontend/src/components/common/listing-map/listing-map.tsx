import * as React from 'react'
import { ClientOnly } from '@tanstack/react-router'

import type { Listing } from '@aporta/shared'

import { cn } from '#/lib/cn'

import { ListingMapContext } from './listing-map-context'

const ListingMapCanvas = React.lazy(() => import('./listing-map-canvas'))

type ListingMapRootProps = {
  listings: ReadonlyArray<Listing>
  activeSlug: string | null
  onSelect: (slug: string | null) => void
  className?: string
  children?: React.ReactNode
}

/**
 * A casca do mapa. `ClientOnly` mais `lazy` mantêm o Leaflet fora do servidor
 * e fora do bundle da primeira pintura: quem abre a lista em 4G instável vê os
 * cards antes de o mapa terminar de baixar, e o fallback reserva a caixa para a
 * página não pular quando ele chega.
 */
export function ListingMapRoot({
  listings,
  activeSlug,
  onSelect,
  className,
  children,
}: ListingMapRootProps): React.JSX.Element {
  const value = React.useMemo(
    () => ({ listings, activeSlug, onSelect }),
    [listings, activeSlug, onSelect],
  )

  return (
    <ListingMapContext value={value}>
      <div className={cn('relative size-full', className)}>
        <ClientOnly
          fallback={<div className="size-full rounded-card bg-moss-wash" />}
        >
          <React.Suspense
            fallback={<div className="size-full rounded-card bg-moss-wash" />}
          >
            <ListingMapCanvas />
          </React.Suspense>
        </ClientOnly>
        {children}
      </div>
    </ListingMapContext>
  )
}
