import * as React from 'react'
import { UserCircle } from '@phosphor-icons/react'

import type { ListingOwner } from '@aporta/shared'

import { Card } from '#/components/ui/card'
import { PhosphorVerified } from '#/components/common/listing-card/listing-card-icons'
import { daysSince } from '#/lib/format'
import { m } from '#/paraglide/messages'

/**
 * O cartão do dono: nome, selo de verificado e há quantos dias o anúncio foi
 * atualizado. Anúncio parado é imóvel já alugado ou golpe, os dois defeitos do
 * grupo de WhatsApp, e o selo mais a data respondem às duas dúvidas antes do
 * contato.
 */
export function OwnerCard({
  owner,
}: {
  owner: ListingOwner
}): React.JSX.Element {
  return (
    <Card
      role="region"
      aria-label={m.owner_label()}
      className="flex-row items-center gap-3 rounded-card bg-surface p-4 ring-0"
    >
      <UserCircle aria-hidden weight="duotone" className="size-12 text-moss" />
      <div className="flex flex-col gap-0.5">
        <p className="font-bold text-ink">{owner.name}</p>
        {owner.verified && (
          <p className="inline-flex items-center gap-1 text-sm font-semibold text-moss">
            <PhosphorVerified />
            {m.owner_verified()}
          </p>
        )}
        <p className="text-sm text-ink-soft">
          {m.updated_days({ count: daysSince(owner.updatedAt) })}
        </p>
      </div>
    </Card>
  )
}
