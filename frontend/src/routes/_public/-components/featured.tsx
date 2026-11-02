import * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'

import { FEATURED_PARAMS } from '../-featured'
import { ListingCard } from '#/components/common/listing-card'
import { PillButton } from '#/components/common/pill-button'
import { storefrontListingsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { m } from '#/paraglide/messages'

/** "Disponíveis agora": a ordem e o recorte vêm do servidor (`FEATURED_PARAMS`). */
export function Featured(): React.JSX.Element | null {
  const { data: items } = useSuspenseQuery(
    storefrontListingsQueryOptions(FEATURED_PARAMS),
  ).data

  // Sem anúncio publicado a seção inteira sai, título e botão junto: "Disponíveis
  // agora" sobre uma grade vazia diria o contrário do que quer dizer.
  if (items.length === 0) return null

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
