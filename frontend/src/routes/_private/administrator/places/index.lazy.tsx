import * as React from 'react'
import { Plus } from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute, getRouteApi } from '@tanstack/react-router'

import { PLACE_CATEGORIES } from '@aporta/shared'
import type { PlaceCategory } from '@aporta/shared'

import { ActionButton } from '#/components/common/action-button'
import { EmptyState } from '#/components/common/empty-state'
import { PaginationNav } from '#/components/common/pagination-nav'
import { PillButton } from '#/components/common/pill-button'
import { QueueSearch } from '#/components/common/queue-search'
import { SegmentedFilter } from '#/components/common/segmented-filter'
import { administratorPlacesQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { PLACE_CATEGORY_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { PlaceRow } from './-components/place-row'
import type { PlaceOutcome } from './-components/place-row'
import { toPlacesParams } from './-search'

export const Route = createLazyFileRoute('/_private/administrator/places/')({
  component: RouteComponent,
})

const route = getRouteApi('/_private/administrator/places/')

type View = 'live' | 'archived'

/** "Todas as abas" não é uma categoria da API: é a ausência do filtro, e tem o próprio botão. */
type Tab = PlaceCategory | 'ALL'

const EMPTY: Record<View, { title: () => string; text: () => string }> = {
  live: {
    title: () => m.staff_places_empty_live_title(),
    text: () => m.staff_places_empty_live_text(),
  },
  archived: {
    title: () => m.staff_places_empty_archived_title(),
    text: () => m.staff_places_empty_archived_text(),
  },
}

const OUTCOME_MESSAGES: Record<PlaceOutcome, () => string> = {
  archived: () => m.staff_places_outcome_archived(),
  restored: () => m.staff_places_outcome_restored(),
  deleted: () => m.staff_places_outcome_deleted(),
}

/**
 * O guia da cidade para a equipe: no ar ou arquivados, por aba, com busca e página na URL.
 * A confirmação de arquivar, restaurar ou excluir fica aqui em cima, na lista, porque a linha sai
 * do filtro assim que a lista refaz, e uma mensagem dentro dela sumiria junto.
 */
function RouteComponent(): React.JSX.Element {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [outcome, setOutcome] = React.useState<PlaceOutcome | undefined>(
    undefined,
  )
  const archived = search.archived === true
  const { data: places, meta } = useSuspenseQuery(
    administratorPlacesQueryOptions(toPlacesParams(search)),
  ).data

  let view: View = 'live'
  if (archived) view = 'archived'

  let tab: Tab = 'ALL'
  if (search.category !== undefined) tab = search.category

  function go(patch: {
    category?: PlaceCategory | undefined
    archived?: true | undefined
    page?: number
    q?: string | undefined
  }): void {
    setOutcome(undefined)
    void navigate({ search: (previous) => ({ ...previous, ...patch }) })
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-title font-extrabold tracking-tight text-ink">
          {m.staff_places_title()}
        </h1>
        <p className="text-lg text-ink-soft">{m.staff_places_lead()}</p>
        <PillButton
          to="/administrator/places/new"
          scale="lg"
          className="w-full sm:w-auto sm:self-start"
        >
          <Plus aria-hidden weight="bold" className="size-5" />
          {m.staff_places_new()}
        </PillButton>
      </header>

      <SegmentedFilter<View>
        label={m.staff_places_view_label()}
        value={view}
        options={[
          { value: 'live', label: m.staff_places_view_live() },
          { value: 'archived', label: m.staff_places_view_archived() },
        ]}
        onChange={(value) => {
          if (value === 'archived') go({ archived: true, page: undefined })
          else go({ archived: undefined, page: undefined })
        }}
      />

      <SegmentedFilter<Tab>
        label={m.staff_places_category_label()}
        value={tab}
        options={[
          { value: 'ALL', label: m.staff_places_category_all() },
          ...PLACE_CATEGORIES.map((value) => ({
            value,
            label: PLACE_CATEGORY_LABELS[value](),
          })),
        ]}
        onChange={(value) => {
          if (value === 'ALL') go({ category: undefined, page: undefined })
          else go({ category: value, page: undefined })
        }}
      />

      <QueueSearch
        label={m.staff_places_search_label()}
        value={search.q ?? ''}
        onSearch={(q) => go({ q, page: undefined })}
      />

      {outcome !== undefined && (
        <p
          role="status"
          className="rounded-xl bg-moss-wash px-4 py-3 text-sm font-bold text-moss-deep"
        >
          {OUTCOME_MESSAGES[outcome]()}
        </p>
      )}

      {places.length === 0 && search.q !== undefined && (
        <EmptyState
          title={m.staff_places_search_empty_title()}
          description={m.staff_places_search_empty_text({ q: search.q })}
        >
          <ActionButton
            tone="outline"
            onClick={() => go({ q: undefined, page: undefined })}
          >
            {m.staff_search_clear()}
          </ActionButton>
        </EmptyState>
      )}

      {places.length === 0 && search.q === undefined && (
        <EmptyState
          title={EMPTY[view].title()}
          description={EMPTY[view].text()}
        />
      )}

      {places.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-ink-soft" aria-live="polite">
            {m.staff_places_count({ count: meta.total })}
          </p>
          <ul className="flex flex-col gap-3">
            {places.map((place) => (
              <PlaceRow key={place.id} place={place} onOutcome={setOutcome} />
            ))}
          </ul>
        </div>
      )}

      <PaginationNav meta={meta} onPage={(page) => go({ page })} />
    </div>
  )
}
