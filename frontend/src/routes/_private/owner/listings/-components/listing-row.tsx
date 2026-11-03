import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'

import type { OwnerListingShowResponse } from '@aporta/shared'

import { Button } from '#/components/ui/button'
import { ConfirmDialog } from '#/components/common/confirm-dialog'
import { ListingPhoto } from '#/components/common/listing-photo'
import { PillButton } from '#/components/common/pill-button'
import { ReviewNote } from '#/components/common/review-note'
import { StatusChip } from '#/components/common/status-chip'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { useOwnerListingArchiveMutation } from '#/integrations/tanstack-query/mutations/owner-listings'
import { formatCurrency } from '#/lib/format'
import { LISTING_TYPE_LABELS } from '#/lib/labels'
import { ownerFailureMessage } from '#/lib/owner-failure'
import { returnedReview } from '#/lib/returned-review'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

/** O valor mais baixo que o anúncio informa, na unidade em que o dono o anunciou. */
function priceOf(listing: OwnerListingShowResponse): string {
  const { monthly, daily } = listing.price
  const locale = getLocale()

  if (monthly !== null) {
    return `${formatCurrency(monthly, locale)}${m.price_per_month()}`
  }
  if (daily !== null) {
    return `${formatCurrency(daily, locale)}${m.price_per_day()}`
  }
  return ''
}

/**
 * Um anúncio da conta: foto, título, estado, valor e as ações. "Arquivar" pede
 * confirmação que nomeia o anúncio e a consequência (`_standards/frontend.md` §10.6), e só
 * fecha quando o servidor confirma, para o erro aparecer onde a pessoa está olhando.
 *
 * Só o anúncio `PUBLISHED` tem "Ver no site": os outros estados a vitrine trata como
 * inexistentes, e o link levaria a um 404.
 */
export function ListingRow({
  listing,
}: {
  listing: OwnerListingShowResponse
}): React.JSX.Element {
  const queryClient = useQueryClient()
  const invalidate = useInvalidate()
  const [failure, setFailure] = React.useState<string | undefined>(undefined)

  const archive = useOwnerListingArchiveMutation()

  const cover = listing.photos[0]
  const price = priceOf(listing)
  // Um rascunho com motivo é um anúncio devolvido: o dono tem o que ajustar, e salvar reenvia.
  const returned = returnedReview(listing)

  function confirm(close: () => void): void {
    setFailure(undefined)
    archive.mutate(listing.id, {
      async onSuccess() {
        // O anúncio foi para a lixeira: o detalhe dele sai do cache, a lista e a vitrine
        // refazem. A promessa devolvida mantém o botão ocupado até a lista voltar.
        queryClient.removeQueries({
          queryKey: queryKeys.owner.listings.detail(listing.id),
        })
        await Promise.all([
          invalidate('owner.listings'),
          invalidate('storefront.listings'),
        ])
        close()
      },
      onError: (error) => setFailure(ownerFailureMessage(error)),
    })
  }

  return (
    <li
      data-slot="owner-listing-row"
      className="flex flex-col gap-4 rounded-card bg-surface p-4 sm:flex-row sm:p-5"
    >
      <div className="aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl sm:w-48">
        {cover !== undefined && (
          <ListingPhoto
            photo={cover}
            listingType={listing.type}
            title={listing.title}
          />
        )}
        {cover === undefined && (
          <ListingPhoto
            photo={{ id: listing.id, environment: 'FACADE', url: null }}
            listingType={listing.type}
            title={listing.title}
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-2">
          <StatusChip
            status={listing.status}
            needsAdjustment={returned !== undefined}
            className="self-start"
          />
          <h2 className="text-lg leading-snug font-extrabold break-words text-ink">
            {listing.title}
          </h2>
          <p className="text-sm text-ink-soft">
            {LISTING_TYPE_LABELS[listing.type]()}
            {' · '}
            {listing.neighborhood.name}
          </p>
          {price !== '' && (
            <p className="text-base font-extrabold text-ink">{price}</p>
          )}
        </div>
        {returned !== undefined && (
          <ReviewNote note={returned.note} reviewedAt={returned.reviewedAt}>
            <p className="text-sm text-ink-soft">
              {m.review_note_resubmit_list()}
            </p>
          </ReviewNote>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <PillButton
            to="/owner/listings/$id"
            params={{ id: listing.id }}
            tone="link"
            aria-label={m.owner_listings_edit_named({ title: listing.title })}
          >
            {m.owner_listings_edit()}
          </PillButton>
          {listing.status === 'PUBLISHED' && (
            <Link
              to="/listings/$slug"
              params={{ slug: listing.slug }}
              className="inline-flex min-h-11 items-center text-sm font-bold text-moss underline underline-offset-4"
            >
              {m.owner_listings_view()}
            </Link>
          )}
          <ConfirmDialog
            title={m.owner_listings_archive_title({ title: listing.title })}
            description={m.owner_listings_archive_text()}
            confirmLabel={m.owner_listings_archive_confirm()}
            cancelLabel={m.owner_listings_archive_keep()}
            error={failure}
            pending={archive.isPending}
            onConfirm={confirm}
            renderTrigger={(open) => (
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setFailure(undefined)
                  open()
                }}
                aria-label={m.owner_listings_archive_named({
                  title: listing.title,
                })}
                className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-danger underline underline-offset-4 hover:bg-clay-wash"
              >
                {m.owner_listings_archive()}
              </Button>
            )}
          />
        </div>
      </div>
    </li>
  )
}
