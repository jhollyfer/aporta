import * as React from 'react'

import { formatDate } from '#/lib/format'
import { getLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'

import { useListingCard } from './listing-card-context'

/** O selo "disponível a partir de", que é o que quem chega com data marcada quer saber primeiro. */
export function ListingCardAvailable(): React.JSX.Element {
  const { listing } = useListingCard()

  return (
    <p className="inline-flex w-fit rounded-full bg-sun/25 px-2.5 py-1 text-xs font-semibold text-ink">
      {m.available_from({
        date: formatDate(listing.availableFrom, getLocale()),
      })}
    </p>
  )
}
