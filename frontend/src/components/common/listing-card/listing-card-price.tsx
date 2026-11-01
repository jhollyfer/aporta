import * as React from 'react'

import { formatCurrency } from '#/lib/format'
import { getLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'

import { useListingCard } from './listing-card-context'

/**
 * O preço na unidade em que o dono anunciou, com o que está incluso logo
 * abaixo. É a transparência do QuintoAndar: o visitante não deveria abrir o
 * anúncio para descobrir que a luz não entra.
 */
export function ListingCardPrice(): React.JSX.Element {
  const { listing } = useListingCard()
  const locale = getLocale()
  const { monthly, daily } = listing.price

  let amount = ''
  if (monthly !== null)
    amount = `${formatCurrency(monthly, locale)}${m.price_per_month()}`
  if (monthly === null && daily !== null) {
    amount = `${formatCurrency(daily, locale)}${m.price_per_day()}`
  }

  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-lg font-extrabold text-ink">{amount}</p>
      <p className="text-xs text-ink-soft">{includedSummary(listing.costs)}</p>
    </div>
  )
}

function includedSummary(costs: {
  water: boolean
  electricity: boolean
  internet: boolean
}): string {
  const included: Array<string> = []
  if (costs.water) included.push(m.cost_water())
  if (costs.electricity) included.push(m.cost_electricity())
  if (costs.internet) included.push(m.cost_internet())

  if (included.length === 0) return m.costs_none_included()
  return m.costs_included({ list: included.join(', ') })
}
