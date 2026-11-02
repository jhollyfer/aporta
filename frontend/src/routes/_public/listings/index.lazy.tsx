import * as React from 'react'
import { createLazyFileRoute, getRouteApi } from '@tanstack/react-router'

import { EmptyState } from '#/components/common/empty-state'
import { FilterBar } from '#/components/common/filter-bar'
import { ListingCard } from '#/components/common/listing-card'
import { ListingMap } from '#/components/common/listing-map'
import { LISTINGS } from '#/lib/data/listings'
import { EMPTY_FILTERS, filterListings } from '#/lib/filters'
import type { ListingFilters } from '#/lib/filters'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

import { ViewToggle } from './-components/view-toggle'
import { LISTINGS_VIEW, NEXT_VIEW, toFilters, toSearchPatch } from './-search'

export const Route = createLazyFileRoute('/_public/listings/')({
  component: RouteComponent,
})

const route = getRouteApi('/_public/listings/')

/**
 * A listagem: filtros em uma fileira, grade de cards e o mapa de apoio. No
 * desktop o mapa ocupa cerca de um terço, à direita; no celular lista e mapa se
 * alternam pelo botão flutuante, porque os dois lado a lado não cabem em 360px.
 */
function RouteComponent(): React.JSX.Element {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const resultsRef = React.useRef<HTMLUListElement>(null)

  const filters = toFilters(search)
  const results = filterListings(LISTINGS, filters)
  const view = search.view ?? LISTINGS_VIEW.LIST
  const showingMap = view === LISTINGS_VIEW.MAP

  function handleChange(patch: Partial<ListingFilters>) {
    void navigate({
      search: (previous) => ({ ...previous, ...toSearchPatch(patch) }),
      replace: true,
    })
  }

  function handleClear() {
    void navigate({
      search: (previous) => ({
        ...previous,
        ...toSearchPatch(EMPTY_FILTERS),
      }),
      replace: true,
    })
  }

  /* "Mostrar N imóveis" leva o olho ao resultado e, no celular, sai do mapa. */
  function handleApply() {
    void navigate({
      search: (previous) => ({ ...previous, view: undefined }),
      replace: true,
    })
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleSelect(slug: string | null) {
    void navigate({
      search: (previous) => ({ ...previous, selected: slug ?? undefined }),
      replace: true,
    })
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-8">
      <h1 className="enter text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.02] font-extrabold tracking-tight text-ink">
        {m.listings_title()}
      </h1>

      <FilterBar
        filters={filters}
        count={results.length}
        onChange={handleChange}
        onClear={handleClear}
        onApply={handleApply}
      >
        <FilterBar.Fields />
        <FilterBar.Chips />
        <FilterBar.Actions />
      </FilterBar>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className={cn(showingMap && 'hidden lg:block')}>
          {results.length === 0 && (
            <EmptyState
              title={m.listings_empty_title()}
              description={m.listings_empty_description()}
            >
              <button
                type="button"
                onClick={handleClear}
                className="h-11 rounded-full bg-moss px-6 text-sm font-extrabold text-paper hover:bg-moss-deep"
              >
                {m.filter_clear()}
              </button>
            </EmptyState>
          )}
          {results.length > 0 && (
            <ul
              ref={resultsRef}
              className="grid scroll-mt-24 gap-x-6 gap-y-10 sm:grid-cols-2"
            >
              {results.map((listing, index) => (
                <li key={listing.id} className="reveal">
                  <ListingCard listing={listing}>
                    <ListingCard.Photo priority={index < 2} />
                    <ListingCard.Badge />
                    <ListingCard.Title />
                    <ListingCard.Meta />
                    <ListingCard.Price />
                    <ListingCard.Available />
                  </ListingCard>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className={cn(
            'h-[70dvh] lg:sticky lg:top-24 lg:h-[calc(100dvh-8rem)]',
            !showingMap && 'hidden lg:block',
          )}
        >
          <ListingMap
            listings={results}
            activeSlug={search.selected ?? null}
            onSelect={handleSelect}
          >
            <ListingMap.Summary />
          </ListingMap>
        </div>
      </div>

      <ViewToggle
        view={view}
        onToggle={() =>
          void navigate({
            search: (previous) => ({
              ...previous,
              view: NEXT_VIEW[view],
            }),
            replace: true,
          })
        }
      />
    </div>
  )
}
