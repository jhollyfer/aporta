import * as React from 'react'

import { ListingCard } from '#/components/common/listing-card'
import { PillButton } from '#/components/common/pill-button'
import { LISTINGS } from '#/lib/data/listings'
import { m } from '#/paraglide/messages'

/** Quantos anúncios a home mostra: o suficiente para dar a ideia, sem virar a listagem. */
const FEATURED_COUNT = 6

/** "Disponíveis agora": os mais recentemente atualizados primeiro, porque anúncio parado é o que o visitante teme. */
export function Featured(): React.JSX.Element {
  const items = [...LISTINGS]
    .sort((a, b) => b.owner.updatedAt.localeCompare(a.owner.updatedAt))
    .slice(0, FEATURED_COUNT)

  return (
    <section
      aria-labelledby="featured-title"
      className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-20"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2
          id="featured-title"
          className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl"
        >
          {m.featured_title()}
        </h2>
        <PillButton to="/listings" tone="outline">
          {m.featured_all()}
        </PillButton>
      </div>
      <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((listing, index) => (
          <li key={listing.id} className="reveal">
            <ListingCard listing={listing}>
              <ListingCard.Photo priority={index === 0} />
              <ListingCard.Badge />
              <ListingCard.Title />
              <ListingCard.Meta />
              <ListingCard.Price />
              <ListingCard.Available />
            </ListingCard>
          </li>
        ))}
      </ul>
    </section>
  )
}
