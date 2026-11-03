import type * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute, getRouteApi } from '@tanstack/react-router'

import { PLACE_CATEGORY } from '@aporta/shared'

import { EmptyState } from '#/components/common/empty-state'
import { GuideTabs } from '#/components/common/guide-tabs'
import { PlaceCard } from '#/components/common/place-card'
import { storefrontPlacesQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { m } from '#/paraglide/messages'

import { toPlaceParams } from './-search'

export const Route = createLazyFileRoute('/_public/guide/')({
  component: RouteComponent,
})

const route = getRouteApi('/_public/guide/')

/**
 * O guia da cidade: quatro abas, cards curtos. Evento vem em ordem de data,
 * porque a pergunta de quem chega é "o que vem aí"; o resto vem em ordem alfabética,
 * que é a do servidor.
 */
function RouteComponent(): React.JSX.Element {
  const { category } = route.useSearch()

  const { data } = useSuspenseQuery(
    storefrontPlacesQueryOptions(toPlaceParams(category)),
  ).data

  // A API ordena só por nome, e o evento precisa de data: o recorte é da aba inteira
  // (até 100), então ordenar aqui não esconde nada.
  const places = [...data].sort((a, b) => {
    if (category !== PLACE_CATEGORY.EVENT) return 0
    return (a.date ?? '').localeCompare(b.date ?? '')
  })

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-14">
      <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        <header className="flex flex-col gap-3">
          <h1 className="text-headline font-extrabold tracking-tight text-ink">
            {m.guide_title()}
          </h1>
          <p className="max-w-md text-lg text-ink-soft">{m.guide_lead()}</p>
        </header>
        <GuideTabs active={category} />
      </div>
      {places.length === 0 && (
        <EmptyState
          title={m.guide_empty_title()}
          description={m.guide_empty_description()}
        />
      )}
      {places.length > 0 && (
        <ul className="flex flex-col gap-4">
          {places.map((place) => (
            <li key={place.id}>
              <PlaceCard place={place} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
