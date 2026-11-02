import * as React from 'react'
import { CaretRight } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'

import type { AdministratorListingShowResponse } from '@aporta/shared'

import { ListingPhoto } from '#/components/common/listing-photo'
import { StatusChip } from '#/components/common/status-chip'
import { VerifiedMark } from '#/components/common/verified-mark'
import { cn } from '#/lib/cn'
import { formatDateTime } from '#/lib/format'
import { LISTING_TYPE_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

/**
 * As colunas da fila no desktop. Uma grade e não uma `<table>`: abaixo de `lg` a linha é um
 * cartão (foto à esquerda, dados empilhados à direita), e a mesma marcação serve às duas
 * larguras sem duplicar o conteúdo no HTML.
 */
const DESKTOP_COLUMNS =
  'lg:grid-cols-[5rem_minmax(0,2fr)_minmax(0,1.7fr)_9rem_9rem_1.25rem] lg:gap-x-4'

/** Cada dado abaixo da foto entra na segunda coluna do cartão; no desktop a grade o posiciona. */
const CELL = 'col-start-2 lg:col-start-auto'

/** Os rótulos das colunas, só no desktop: no celular cada valor já se explica sozinho. */
export function QueueHeader(): React.JSX.Element {
  return (
    <div
      aria-hidden
      className={cn(
        'hidden gap-x-4 px-3 text-xs font-bold text-ink-soft lg:grid',
        DESKTOP_COLUMNS,
      )}
    >
      <span />
      <span>{m.staff_column_listing()}</span>
      <span>{m.staff_column_owner()}</span>
      <span>{m.staff_column_updated()}</span>
      <span>{m.staff_column_status()}</span>
      <span />
    </div>
  )
}

/**
 * Uma linha da fila: foto, título e bairro, dono (com o selo, que a equipe confere antes de
 * decidir), quando mexeram e o estado. A linha inteira é o link: o alvo de toque é o
 * cartão, não um botão pequeno no canto.
 */
export function QueueRow({
  listing,
}: {
  listing: AdministratorListingShowResponse
}): React.JSX.Element {
  const cover = listing.photos[0] ?? {
    id: listing.id,
    environment: 'FACADE',
    url: null,
  }
  const needsAdjustment = typeof listing.review?.note === 'string'

  return (
    <li data-slot="queue-row">
      <Link
        to="/administrator/listings/$id"
        params={{ id: listing.id }}
        className={cn(
          'group grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 rounded-card bg-surface p-3 hover:bg-moss-wash lg:items-center lg:pr-4',
          DESKTOP_COLUMNS,
        )}
      >
        <div className="row-span-4 aspect-[4/3] overflow-hidden rounded-xl lg:row-span-1">
          <ListingPhoto
            photo={cover}
            listingType={listing.type}
            title={listing.title}
          />
        </div>
        <div className={cn(CELL, 'flex min-w-0 flex-col gap-0.5')}>
          <p className="text-base leading-snug font-extrabold break-words text-ink">
            {listing.title}
          </p>
          <p className="text-sm text-ink-soft">
            {LISTING_TYPE_LABELS[listing.type]()}
            {' · '}
            {listing.neighborhood.name}
          </p>
        </div>
        <div className={cn(CELL, 'flex min-w-0 flex-col gap-0.5 text-sm')}>
          <p className="inline-flex flex-wrap items-center gap-x-1.5 font-bold break-words text-ink">
            {listing.account?.name ?? listing.owner.name}
            {listing.account?.verified === true && <VerifiedMark />}
          </p>
          {listing.account !== null && (
            <p className="text-ink-soft [overflow-wrap:anywhere]">
              {listing.account.email}
            </p>
          )}
        </div>
        <p className={cn(CELL, 'text-sm text-ink-soft')}>
          {formatDateTime(listing.updatedAt, getLocale())}
        </p>
        <StatusChip
          status={listing.status}
          needsAdjustment={needsAdjustment}
          className={cn(CELL, 'mt-1 self-start lg:mt-0 lg:justify-self-start')}
        />
        <CaretRight
          aria-hidden
          weight="bold"
          className="hidden size-5 text-ink-soft group-hover:text-ink lg:block"
        />
      </Link>
    </li>
  )
}
