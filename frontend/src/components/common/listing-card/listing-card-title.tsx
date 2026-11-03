import * as React from 'react'

import { useListingCard } from './listing-card-context'

type ListingCardTitleProps = {
  /** O nível do título: `h3` sob uma seção da página (home), `h2` quando a lista vem logo após o `h1`. */
  as?: 'h2' | 'h3'
}

export function ListingCardTitle({
  as: Heading = 'h3',
}: ListingCardTitleProps): React.JSX.Element {
  const { listing } = useListingCard()

  return (
    <Heading className="line-clamp-2 text-base font-bold leading-snug text-ink">
      {listing.title}
    </Heading>
  )
}
