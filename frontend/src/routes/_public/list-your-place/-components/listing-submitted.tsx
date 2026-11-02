import * as React from 'react'

import type { OwnerListingShowResponse } from '@aporta/shared'

import { PillButton } from '#/components/common/pill-button'
import { StatusChip } from '#/components/common/status-chip'
import { m } from '#/paraglide/messages'

/**
 * A tela depois do envio: o anúncio nasce em análise (`PENDING`), a equipe o revisa e só
 * então ele aparece na vitrine. Diz isso com o chip do estado, para o dono não esperar o
 * anúncio no ar na mesma hora e achar que o envio falhou.
 */
export function ListingSubmitted({
  listing,
}: {
  listing: OwnerListingShowResponse
}): React.JSX.Element {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-5 px-4 pt-12 pb-8">
      <StatusChip status={listing.status} />
      <h1 className="text-title font-extrabold tracking-tight text-ink">
        {m.owner_ready_title()}
      </h1>
      <p className="text-lg text-ink-soft">
        {m.owner_ready_text({ title: listing.title })}
      </p>
      <div className="flex flex-wrap gap-3">
        <PillButton to="/owner/listings" scale="lg">
          {m.owner_ready_listings()}
        </PillButton>
        <PillButton to="/" tone="link">
          {m.not_found_home()}
        </PillButton>
      </div>
    </div>
  )
}
