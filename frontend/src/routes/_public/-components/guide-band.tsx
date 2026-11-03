import * as React from 'react'
import { Link } from '@tanstack/react-router'

import { PLACE_CATEGORIES } from '@aporta/shared'

import { PillButton } from '#/components/common/pill-button'
import { PLACE_CATEGORY_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

/**
 * A chamada do guia: a cidade para quem acabou de chegar, com o festival como gancho para
 * o turista. Texto à esquerda e, à direita, as quatro categorias do guia como links grandes
 * (cada uma abre o guia naquela aba), sem desenho repetido da casa.
 */
export function GuideBand(): React.JSX.Element {
  return (
    <section
      aria-labelledby="guide-title"
      className="mx-auto mt-24 grid max-w-6xl items-end gap-8 px-4 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-16"
    >
      <div className="flex flex-col gap-5">
        <h2
          id="guide-title"
          className="text-title font-extrabold tracking-tight text-balance text-ink"
        >
          {m.guide_band_title()}
        </h2>
        <p className="text-lg text-ink-soft">{m.guide_band_text()}</p>
        <div>
          <PillButton to="/guide" tone="link">
            {m.guide_band_cta()}
          </PillButton>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {PLACE_CATEGORIES.map((category) => (
          <li key={category}>
            <Link
              to="/guide"
              search={{ category }}
              className="flex min-h-24 items-end rounded-card bg-moss-wash p-5 text-xl font-extrabold text-moss-deep transition-colors hover:bg-moss hover:text-paper motion-reduce:transition-none"
            >
              {PLACE_CATEGORY_LABELS[category]()}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
