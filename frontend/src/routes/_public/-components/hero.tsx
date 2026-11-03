import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowUpRight } from '@phosphor-icons/react'

import { LISTING_PERIODS, LISTING_TYPES } from '@aporta/shared'

import { PillButton } from '#/components/common/pill-button'
import { SearchPill, SEARCH_FIELD } from '#/components/common/search-pill'
import type { SearchValues } from '#/components/common/search-pill'
import { LISTING_TYPE_LABELS } from '#/lib/labels'
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
 * A primeira tela, assimétrica de propósito: o título e a busca à esquerda, e à direita
 * a lista dos tipos de imóvel em texto grande, como um índice, no lugar dos ícones soltos
 * e da faixa de desenho. Quando houver foto real da cidade (docs/DESIGN.md §1), ela ocupa
 * a coluna da direita; enquanto não há, a tipografia faz o trabalho e a página não
 * finge uma imagem.
 */
export function Hero(): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <section aria-labelledby="hero-title" className="relative">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-10 pb-4 sm:pt-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-16">
        <div className="flex flex-col gap-7">
          <p className="text-sm font-bold tracking-widest text-ink-soft uppercase">
            {m.hero_kicker()}
          </p>
          <h1
            id="hero-title"
            className="max-w-3xl text-display font-extrabold tracking-tight text-balance text-ink"
          >
            {m.hero_title()}
          </h1>
          <p className="max-w-xl text-lg text-ink-soft">{m.hero_lead()}</p>

          <SearchPill
            onSearch={(values) =>
              void navigate({ to: '/listings', search: toSearch(values) })
            }
          >
            <SearchPill.Segment field={SEARCH_FIELD.TYPE} />
            <SearchPill.Segment field={SEARCH_FIELD.NEIGHBORHOOD} />
            <SearchPill.Segment field={SEARCH_FIELD.PERIOD} />
            <SearchPill.Submit />
          </SearchPill>

          <div>
            <PillButton to="/list-your-place" tone="link">
              {m.hero_cta_owner()}
            </PillButton>
          </div>
        </div>

        <nav
          aria-label={m.hero_categories_label()}
          className="lg:self-end lg:pb-2"
        >
          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {LISTING_TYPES.map((type) => (
              <li key={type}>
                <Link
                  to="/listings"
                  search={{ type }}
                  className="group flex min-h-14 items-center justify-between gap-4 py-3 text-2xl font-extrabold tracking-tight text-ink transition-colors hover:text-moss motion-reduce:transition-none"
                >
                  {LISTING_TYPE_LABELS[type]()}
                  <ArrowUpRight
                    aria-hidden
                    className="size-6 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  )
}
