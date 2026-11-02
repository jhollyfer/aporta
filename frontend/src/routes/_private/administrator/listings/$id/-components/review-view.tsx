import * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'

import { ListingPhoto } from '#/components/common/listing-photo'
import { PillButton } from '#/components/common/pill-button'
import { StatusChip } from '#/components/common/status-chip'
import { administratorListingQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { LISTING_TYPE_LABELS, PHOTO_ENVIRONMENT_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { DecisionPanel } from './decision-panel'
import { ListingFacts } from './listing-facts'
import { OwnerSeal } from './owner-seal'

/** Um bloco com título: a revisão é uma página só, e o título é o que separa os assuntos. */
function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="flex flex-col gap-4 rounded-card bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-extrabold text-ink">{title}</h2>
      {children}
    </section>
  )
}

/**
 * O anúncio como a equipe o revisa: fotos e dados à esquerda (o que se confere), decisão e
 * dono à direita (o que se faz). No celular a ordem é a da tarefa: quem é, o que decidir,
 * e só então o que conferir, porque o botão de decisão não pode ficar três rolagens abaixo
 * das fotos.
 *
 * Sem foto, a cena do ambiente: um anúncio sem foto é informação para a equipe, e o texto
 * ao lado diz isso em vez de deixar a cena parecer foto.
 */
export function ReviewView({ id }: { id: string }): React.JSX.Element {
  const { data: listing } = useSuspenseQuery(
    administratorListingQueryOptions(id),
  )
  const photos = listing.photos

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <PillButton
          to="/administrator/listings"
          tone="link"
          className="self-start"
        >
          {m.staff_detail_back()}
        </PillButton>
        <StatusChip
          status={listing.status}
          needsAdjustment={typeof listing.review?.note === 'string'}
          className="self-start"
        />
        <h1 className="text-title font-extrabold tracking-tight break-words text-ink">
          {listing.title}
        </h1>
        <p className="text-base text-ink-soft">
          {LISTING_TYPE_LABELS[listing.type]()}
          {' · '}
          {listing.neighborhood.name}
        </p>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="order-2 flex flex-col gap-6 lg:order-1">
          <Panel title={m.staff_detail_photos()}>
            {photos.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo) => (
                  <li key={photo.id} className="flex flex-col gap-1.5">
                    <div className="aspect-[4/3] overflow-hidden rounded-xl">
                      <ListingPhoto
                        photo={photo}
                        listingType={listing.type}
                        title={listing.title}
                      />
                    </div>
                    <p className="text-xs font-bold text-ink-soft">
                      {PHOTO_ENVIRONMENT_LABELS[photo.environment]()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {photos.length === 0 && (
              <div className="flex flex-col gap-3">
                <div className="aspect-[4/3] max-w-sm overflow-hidden rounded-xl">
                  <ListingPhoto
                    photo={{ id: listing.id, environment: 'FACADE', url: null }}
                    listingType={listing.type}
                    title={listing.title}
                  />
                </div>
                <p className="text-sm font-bold text-ink-soft">
                  {m.staff_detail_photos_none()}
                </p>
              </div>
            )}
          </Panel>
          <Panel title={m.staff_detail_facts()}>
            <ListingFacts listing={listing} />
          </Panel>
        </div>

        <div className="order-1 flex flex-col gap-6 lg:sticky lg:top-4 lg:order-2">
          <Panel title={m.staff_detail_decision()}>
            <DecisionPanel listing={listing} />
          </Panel>
          <Panel title={m.staff_detail_owner()}>
            {listing.account !== null && (
              <OwnerSeal account={listing.account} />
            )}
            {listing.account === null && (
              <p className="text-base text-ink-soft">
                {m.staff_detail_owner_none({ name: listing.owner.name })}
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
