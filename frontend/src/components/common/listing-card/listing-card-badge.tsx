import * as React from 'react'

import { LISTING_TYPE_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'
import { PhosphorVerified } from '#/components/common/listing-card/listing-card-icons'

import { useListingCard } from './listing-card-context'

/** Tipo do imóvel e, quando houver, o selo de dono verificado: a confiança que o grupo de WhatsApp não dá. */
export function ListingCardBadge(): React.JSX.Element {
  const { listing } = useListingCard()

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
      <span className="rounded-full bg-moss-wash px-2.5 py-1 text-moss-deep">
        {LISTING_TYPE_LABELS[listing.type]()}
      </span>
      {listing.owner.verified && (
        <span className="inline-flex items-center gap-1 text-moss">
          <PhosphorVerified />
          {m.owner_verified()}
        </span>
      )}
    </div>
  )
}
