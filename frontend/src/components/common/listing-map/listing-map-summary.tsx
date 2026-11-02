import * as React from 'react'
import { Link } from '@tanstack/react-router'

import { ListingCard } from '#/components/common/listing-card'
import { formatCurrency } from '#/lib/format'
import { LISTING_TYPE_LABELS } from '#/lib/labels'
import { cn } from '#/lib/cn'
import { getLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'

import { useListingMap } from './listing-map-context'

/** Flutua sobre o mapa: é overlay de verdade, a única situação em que a sombra se justifica. */
const OVERLAY =
  'absolute inset-x-3 bottom-3 z-[500] rounded-card bg-surface p-3 shadow-xl sm:inset-x-auto sm:right-3 sm:w-72' // taste-skill-ignore: overlay sobre o mapa

/**
 * O resumo do imóvel tocado no pin, sobre o mapa. Sem ele o pin só diz o preço,
 * e no celular o toque seguinte seria sair do mapa para descobrir de que imóvel
 * era o valor.
 *
 * O pin pode ser de um anúncio que não está na página de cards (a lista pagina e o mapa
 * não): então o resumo sai dos dados do próprio pin, que não tem foto nem título, mas leva
 * ao anúncio.
 */
export function ListingMapSummary(): React.JSX.Element | null {
  const { cards, pins, activeSlug } = useListingMap()
  const card = cards.find((item) => item.slug === activeSlug)
  const pin = pins.find((item) => item.slug === activeSlug)

  if (card !== undefined) {
    return (
      <div role="group" aria-label={m.map_selected_label()} className={OVERLAY}>
        <ListingCard listing={card}>
          <ListingCard.Title />
          <ListingCard.Meta />
          <ListingCard.Price />
        </ListingCard>
      </div>
    )
  }

  if (pin === undefined) return null

  const { monthly, daily } = pin.price
  const amount = monthly ?? daily ?? 0
  let unit = m.price_per_month()
  if (monthly === null) unit = m.price_per_day()
  const type = LISTING_TYPE_LABELS[pin.type]()

  return (
    <div
      role="group"
      aria-label={m.map_selected_label()}
      className={cn(OVERLAY, 'p-0')}
    >
      <Link
        to="/listings/$slug"
        params={{ slug: pin.slug }}
        className="flex flex-col gap-1 rounded-card p-4 focus-visible:outline-offset-4"
      >
        <span className="text-sm font-bold text-ink-soft">{type}</span>
        <span className="text-lg font-extrabold text-ink">
          {formatCurrency(amount, getLocale())}
          {unit}
        </span>
        <span className="text-sm font-bold text-moss">
          {m.map_pin_open({ type })}
        </span>
      </Link>
    </div>
  )
}
