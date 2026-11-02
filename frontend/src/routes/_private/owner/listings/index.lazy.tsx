import * as React from 'react'
import { createLazyFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

import { EmptyState } from '#/components/common/empty-state'
import { PillButton } from '#/components/common/pill-button'
import { ownerListingsQueryOptions } from '#/integrations/tanstack-query/queries/owner-listings'
import { m } from '#/paraglide/messages'

import { ListingRow } from './-components/listing-row'
import { LISTINGS_PARAMS } from './-params'

export const Route = createLazyFileRoute('/_private/owner/listings/')({
  component: RouteComponent,
})

function RouteComponent(): React.JSX.Element {
  const { data } = useSuspenseQuery(ownerListingsQueryOptions(LISTINGS_PARAMS))
  const listings = data.data

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <PillButton to="/account" tone="link" className="self-start">
          {m.owner_listings_back()}
        </PillButton>
        <h1 className="text-title font-extrabold tracking-tight text-ink">
          {m.owner_listings_title()}
        </h1>
        <p className="text-lg text-ink-soft">{m.owner_listings_lead()}</p>
      </header>

      {listings.length === 0 && (
        <EmptyState
          title={m.owner_listings_empty_title()}
          description={m.owner_listings_empty_text()}
        >
          <PillButton to="/list-your-place" scale="lg">
            {m.owner_listings_new()}
          </PillButton>
        </EmptyState>
      )}

      {listings.length > 0 && (
        <>
          <ul className="flex flex-col gap-4">
            {listings.map((listing) => (
              <ListingRow key={listing.id} listing={listing} />
            ))}
          </ul>
          <PillButton to="/list-your-place" scale="lg" className="self-start">
            {m.owner_listings_new()}
          </PillButton>
        </>
      )}
    </div>
  )
}
