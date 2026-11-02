import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'

import { LISTING_PERIODS, LISTING_TYPES } from '@aporta/shared'

import { CategoryRail } from '#/components/common/category-rail'
import { PillButton } from '#/components/common/pill-button'
import { Scene, SCENE_KIND } from '#/components/common/scene'
import { SearchPill, SEARCH_FIELD } from '#/components/common/search-pill'
import type { SearchValues } from '#/components/common/search-pill'
import { m } from '#/paraglide/messages'

/*
 * O `select` entrega string, e a rota quer o tipo fechado. Procurar na lista
 * devolve o próprio valor tipado, sem `as`: valor fora da lista vira `undefined`
 * e some da URL.
 */
function toSearch(values: SearchValues) {
  return {
    type: LISTING_TYPES.find((item) => item === values.type),
    neighborhood: values.neighborhood || undefined,
    period: LISTING_PERIODS.find((item) => item === values.period),
  }
}

/**
 * A primeira tela: o título diz o que é e para quem, a busca é a ação, e os dois
 * caminhos resolvem os dois lados (quem procura e quem tem imóvel parado). A
 * cena do rio ocupa a metade de baixo: é a imagem dominante da página, e
 * enquanto não houver foto real da cidade é desenho, não foto de banco.
 */
export function Hero(): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <section aria-labelledby="hero-title" className="relative">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-8 pb-10 sm:pt-14">
        <div className="flex max-w-6xl flex-col gap-5">
          <h1
            id="hero-title"
            className="enter text-[clamp(2.25rem,6.4vw,6rem)] leading-[1.02] font-extrabold tracking-tight text-ink"
          >
            {m.hero_title()}
          </h1>
          <p className="enter max-w-xl text-lg text-ink-soft [--i:1]">
            {m.hero_lead()}
          </p>
          <div className="enter flex flex-wrap gap-3 [--i:2]">
            <PillButton to="/listings" tone="moss" scale="lg">
              {m.hero_cta_search()}
            </PillButton>
            <PillButton to="/list-your-place" tone="sun" scale="lg">
              {m.hero_cta_owner()}
            </PillButton>
          </div>
        </div>

        <SearchPill
          className="enter [--i:3]"
          onSearch={(values) =>
            void navigate({ to: '/listings', search: toSearch(values) })
          }
        >
          <SearchPill.Segment field={SEARCH_FIELD.TYPE} />
          <SearchPill.Segment field={SEARCH_FIELD.NEIGHBORHOOD} />
          <SearchPill.Segment field={SEARCH_FIELD.PERIOD} />
          <SearchPill.Submit />
        </SearchPill>

        <CategoryRail className="enter [--i:4]">
          {LISTING_TYPES.map((type) => (
            <CategoryRail.Item key={type} type={type} />
          ))}
        </CategoryRail>
      </div>
      <div className="h-56 overflow-hidden sm:h-80">
        <Scene kind={SCENE_KIND.PANORAMA} label={m.hero_scene_label()} />
      </div>
    </section>
  )
}
