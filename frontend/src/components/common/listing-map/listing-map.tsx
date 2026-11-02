import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClientOnly } from '@tanstack/react-router'

import type {
  StorefrontListingPinsPayload,
  StorefrontListingShowResponse,
} from '@aporta/shared'

import { storefrontListingPinsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { cn } from '#/lib/cn'
import { sameWindow } from '#/lib/listing-map'
import type { MapWindow } from '#/lib/listing-map'

import { ListingMapContext } from './listing-map-context'

const ListingMapCanvas = React.lazy(() => import('./listing-map-canvas'))

const NO_PINS: ReadonlyArray<never> = []

/** O filtro do catálogo sem a janela: a janela é do mapa, o filtro é da URL. */
type PinFilters = Omit<
  StorefrontListingPinsPayload,
  'minLng' | 'minLat' | 'maxLng' | 'maxLat'
>

type ListingMapRootProps = {
  cards: ReadonlyArray<StorefrontListingShowResponse>
  filters: PinFilters
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
 *
 * Os pins não vêm da lista. O mapa pede à API só os da janela que a pessoa está vendo
 * (`/storefront/listings/pins`), com os filtros da URL: a lista pagina de 12 em 12 e o
 * mapa continua mostrando a cidade inteira, sem depender de a página trazer tudo. A
 * janela só existe no navegador (`onWindowChange` parte do Leaflet), então no servidor a
 * consulta fica desligada e o SSR entrega a caixa vazia.
 */
export function ListingMapRoot({
  cards,
  filters,
  activeSlug,
  onSelect,
  className,
  children,
}: ListingMapRootProps): React.JSX.Element {
  const [window, setWindow] = React.useState<MapWindow | null>(null)

  const handleWindowChange = React.useCallback((next: MapWindow) => {
    setWindow((previous) => {
      if (sameWindow(previous, next)) return previous
      return next
    })
  }, [])

  const pinsQuery = useQuery({
    ...storefrontListingPinsQueryOptions({ ...filters, ...window }),
    enabled: window !== null,
  })

  const fitKey = JSON.stringify(filters)
  const pins = pinsQuery.data?.data ?? NO_PINS
  const total = pinsQuery.data?.meta.total ?? 0
  const ready = window !== null && pinsQuery.data !== undefined
  const error = pinsQuery.error
  const { refetch } = pinsQuery

  const value = React.useMemo(
    () => ({
      cards,
      fitKey,
      activeSlug,
      onSelect,
      pins,
      total,
      ready,
      error,
      onRetry: () => void refetch(),
      onWindowChange: handleWindowChange,
    }),
    [
      cards,
      fitKey,
      activeSlug,
      onSelect,
      pins,
      total,
      ready,
      error,
      refetch,
      handleWindowChange,
    ],
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
