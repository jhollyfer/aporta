import * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute, getRouteApi } from '@tanstack/react-router'

import { LISTING_STATUS } from '@aporta/shared'
import type { ListingStatus } from '@aporta/shared'

import { ActionButton } from '#/components/common/action-button'
import { EmptyState } from '#/components/common/empty-state'
import { PaginationNav } from '#/components/common/pagination-nav'
import { SegmentedFilter } from '#/components/common/segmented-filter'
import { administratorListingsQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { STAFF_LISTING_FILTER_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { QueueSearch } from './-components/queue-search'
import { QueueHeader, QueueRow } from './-components/queue-row'
import { DEFAULT_QUEUE_STATUS, toQueueParams } from './-search'

export const Route = createLazyFileRoute('/_private/administrator/listings/')({
  component: RouteComponent,
})

const route = getRouteApi('/_private/administrator/listings/')

/** Para onde levar quem esvaziou uma fila: a fila de análise e a vitrine são as duas pontas. */
const NEXT_QUEUE: Record<ListingStatus, ListingStatus> = {
  PENDING: LISTING_STATUS.PUBLISHED,
  DRAFT: LISTING_STATUS.PENDING,
  PUBLISHED: LISTING_STATUS.PENDING,
  ARCHIVED: LISTING_STATUS.PENDING,
}

const EMPTY_TITLE: Record<ListingStatus, () => string> = {
  PENDING: () => m.staff_listings_empty_pending_title(),
  DRAFT: () => m.staff_listings_empty_draft_title(),
  PUBLISHED: () => m.staff_listings_empty_published_title(),
  ARCHIVED: () => m.staff_listings_empty_archived_title(),
}

const EMPTY_TEXT: Record<ListingStatus, () => string> = {
  PENDING: () => m.staff_listings_empty_pending_text(),
  DRAFT: () => m.staff_listings_empty_draft_text(),
  PUBLISHED: () => m.staff_listings_empty_published_text(),
  ARCHIVED: () => m.staff_listings_empty_archived_text(),
}

/** A ordem do filtro é a do trabalho: o que espera decisão primeiro, o que saiu do ar por último. */
const FILTER_ORDER = [
  LISTING_STATUS.PENDING,
  LISTING_STATUS.DRAFT,
  LISTING_STATUS.PUBLISHED,
  LISTING_STATUS.ARCHIVED,
] as const satisfies ReadonlyArray<ListingStatus>

/**
 * A fila: o filtro de estado (padrão "Em análise"), a lista e a paginação. A linha abre o
 * anúncio inteiro, onde a equipe decide; aqui só se escolhe qual olhar. O estado vazio da
 * fila de análise é uma boa notícia, e diz isso em vez de "nada aqui".
 */
function RouteComponent(): React.JSX.Element {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const status = search.status ?? DEFAULT_QUEUE_STATUS
  const { data: listings, meta } = useSuspenseQuery(
    administratorListingsQueryOptions(toQueueParams(search)),
  ).data

  function go(patch: {
    status?: ListingStatus
    page?: number
    q?: string | undefined
  }): void {
    void navigate({ search: (previous) => ({ ...previous, ...patch }) })
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-title font-extrabold tracking-tight text-ink">
          {m.staff_listings_title()}
        </h1>
        <p className="text-lg text-ink-soft">{m.staff_listings_lead()}</p>
      </header>

      <SegmentedFilter
        label={m.staff_filter_label()}
        value={status}
        options={FILTER_ORDER.map((value) => ({
          value,
          label: STAFF_LISTING_FILTER_LABELS[value](),
        }))}
        onChange={(value) => go({ status: value, page: undefined })}
      />

      <QueueSearch
        value={search.q ?? ''}
        onSearch={(q) => go({ q, page: undefined })}
      />

      {listings.length === 0 && search.q !== undefined && (
        <EmptyState
          title={m.staff_search_empty_title()}
          description={m.staff_search_empty_text({ q: search.q })}
        >
          <ActionButton
            tone="outline"
            onClick={() => go({ q: undefined, page: undefined })}
          >
            {m.staff_search_clear()}
          </ActionButton>
        </EmptyState>
      )}

      {listings.length === 0 && search.q === undefined && (
        <EmptyState
          title={EMPTY_TITLE[status]()}
          description={EMPTY_TEXT[status]()}
        >
          <ActionButton
            tone="outline"
            onClick={() => go({ status: NEXT_QUEUE[status], page: undefined })}
          >
            {STAFF_LISTING_FILTER_LABELS[NEXT_QUEUE[status]]()}
          </ActionButton>
        </EmptyState>
      )}

      {listings.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-ink-soft" aria-live="polite">
            {m.staff_listings_count({ count: meta.total })}
          </p>
          <QueueHeader />
          <ul className="flex flex-col gap-3">
            {listings.map((listing) => (
              <QueueRow key={listing.id} listing={listing} />
            ))}
          </ul>
        </div>
      )}

      <PaginationNav meta={meta} onPage={(page) => go({ page })} />
    </div>
  )
}
