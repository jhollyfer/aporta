import type * as React from 'react'
import { createLazyFileRoute, getRouteApi } from '@tanstack/react-router'

import { PLACE_CATEGORY } from '@aporta/shared'

import { GuideTabs } from '#/components/common/guide-tabs'
import { PlaceCard } from '#/components/common/place-card'
import { PLACES } from '#/lib/data/places'
import { m } from '#/paraglide/messages'

export const Route = createLazyFileRoute('/_public/guide/')({
  component: RouteComponent,
})

const route = getRouteApi('/_public/guide/')

/**
 * O guia da cidade: quatro abas, cards curtos. Evento vem em ordem de data,
 * porque a pergunta de quem chega é "o que vem aí"; o resto fica na ordem da
 * curadoria.
 */
function RouteComponent(): React.JSX.Element {
  const { category } = route.useSearch()

  const places = PLACES.filter((place) => place.category === category).sort(
    (a, b) => {
      if (category !== PLACE_CATEGORY.EVENT) return 0
      return (a.date ?? '').localeCompare(b.date ?? '')
    },
  )

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 pt-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
          {m.guide_title()}
        </h1>
        <p className="max-w-2xl text-lg text-ink-soft">{m.guide_lead()}</p>
      </header>
      <GuideTabs active={category} />
      <ul className="flex flex-col gap-4">
        {places.map((place) => (
          <li key={place.id}>
            <PlaceCard place={place} />
          </li>
        ))}
      </ul>
    </div>
  )
}
