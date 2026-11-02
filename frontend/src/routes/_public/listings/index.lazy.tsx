import * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute, getRouteApi } from '@tanstack/react-router'

import { ActionButton } from '#/components/common/action-button'
import { EmptyState } from '#/components/common/empty-state'
import { FilterBar } from '#/components/common/filter-bar'
import { ListingCard } from '#/components/common/listing-card'
import { ListingMap } from '#/components/common/listing-map'
import { PaginationNav } from '#/components/common/pagination-nav'
import { storefrontListingsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { EMPTY_FILTERS } from '#/lib/filters'
import type { ListingFilters } from '#/lib/filters'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

import { ViewToggle } from './-components/view-toggle'
import {
  LISTINGS_VIEW,
  NEXT_VIEW,
  toFilters,
  toListingParams,
  toPageParam,
  toPinFilters,
  toSearchPatch,
  withFirstPage,
} from './-search'

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
  const resultsRef = React.useRef<HTMLParagraphElement>(null)

  const filters = toFilters(search)
  const { data: results, meta } = useSuspenseQuery(
    storefrontListingsQueryOptions(toListingParams(search)),
  ).data
  const firstShown = (meta.currentPage - 1) * meta.perPage + 1
  const view = search.view ?? LISTINGS_VIEW.LIST
  const showingMap = view === LISTINGS_VIEW.MAP

  function handleChange(patch: Partial<ListingFilters>) {
    void navigate({
      search: (previous) =>
        withFirstPage({ ...previous, ...toSearchPatch(patch) }),
      replace: true,
    })
  }

  function handleClear() {
    void navigate({
      search: (previous) =>
        withFirstPage({ ...previous, ...toSearchPatch(EMPTY_FILTERS) }),
      replace: true,
    })
  }

  /*
   * Trocar de página é navegar de verdade (entra no histórico: o "voltar" volta à página
   * anterior), e o router não rola nem move o foco por conta própria. Sem isto o clique em
   * "Próxima" deixaria a pessoa no rodapé da lista nova, com o foco num botão que acabou de
   * trocar de texto. O foco vai para a contagem ("Mostrando 13 a 24 de 30"), que é o que o
   * leitor de tela precisa ouvir para saber que a lista mudou. `resetScroll: false` evita o salto ao topo da página, que passaria do
   * começo da lista; quem leva o olho e o foco ao começo dela é esta função, depois que a
   * página nova chegou.
   */
  async function handlePage(page: number) {
    await navigate({
      search: (previous) => ({
        ...previous,
        page: toPageParam(page),
      }),
      resetScroll: false,
    })
    const count = resultsRef.current
    if (count === null) return
    count.scrollIntoView({ behavior: 'auto', block: 'start' })
    count.focus({ preventScroll: true })
  }

  /* "Mostrar N imóveis" leva o olho ao resultado e, no celular, sai do mapa. */
  function handleApply() {
    void navigate({
      search: (previous) => ({ ...previous, view: undefined }),
      replace: true,
    })
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSelect = React.useCallback(
    (slug: string | null) => {
      void navigate({
        search: (previous) => ({ ...previous, selected: slug ?? undefined }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate],
  )

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-8">
      <h1 className="enter text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.02] font-extrabold tracking-tight text-ink">
        {m.listings_title()}
      </h1>

      <FilterBar
        filters={filters}
        count={meta.total}
        onChange={handleChange}
        onClear={handleClear}
        onApply={handleApply}
      >
        <FilterBar.Fields />
        <FilterBar.Chips />
        <FilterBar.Actions />
      </FilterBar>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div
          className={cn('flex flex-col gap-6', showingMap && 'hidden lg:flex')}
        >
          {results.length === 0 && meta.total === 0 && (
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
          {results.length === 0 && meta.total > 0 && (
            <EmptyState
              title={m.listings_page_missing_title()}
              description={m.listings_page_missing_description()}
            >
              <ActionButton tone="moss" onClick={() => void handlePage(1)}>
                {m.listings_page_first()}
              </ActionButton>
            </EmptyState>
          )}
          {results.length > 0 && (
            <>
              <p
                ref={resultsRef}
                tabIndex={-1}
                className="scroll-mt-24 text-sm font-bold text-ink-soft outline-none"
              >
                {m.listings_range({
                  from: firstShown,
                  to: firstShown + results.length - 1,
                  total: meta.total,
                })}
              </p>
              <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2">
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
              <PaginationNav
                meta={meta}
                onPage={(page) => void handlePage(page)}
              />
            </>
          )}
        </div>

        <div
          className={cn(
            'h-[70dvh] lg:sticky lg:top-24 lg:h-[calc(100dvh-8rem)]',
            !showingMap && 'hidden lg:block',
          )}
        >
          <ListingMap
            cards={results}
            filters={toPinFilters(search)}
            activeSlug={search.selected ?? null}
            onSelect={handleSelect}
          >
            <ListingMap.Status />
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
