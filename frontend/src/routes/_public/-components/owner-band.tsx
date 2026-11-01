import * as React from 'react'

import { PillButton } from '#/components/common/pill-button'
import { m } from '#/paraglide/messages'

/**
 * O outro lado: quem se formou e deixou a casa ou a kitnet vazia. Faixa de cor
 * cheia, sem borda nem sombra, que é como esta página separa seções.
 */
export function OwnerBand(): React.JSX.Element {
  return (
    <section
      aria-labelledby="owner-title"
      className="mx-auto mt-28 max-w-6xl px-4"
    >
      <div className="flex flex-col gap-5 rounded-card bg-clay-wash px-6 py-12 sm:px-12">
        <h2
          id="owner-title"
          className="max-w-2xl text-3xl font-extrabold tracking-tight text-ink sm:text-4xl"
        >
          {m.owner_band_title()}
        </h2>
        <p className="max-w-xl text-lg text-ink-soft">{m.owner_band_text()}</p>
        <div>
          <PillButton to="/list-your-place" tone="sun" scale="lg">
            {m.owner_band_cta()}
          </PillButton>
        </div>
      </div>
    </section>
  )
}
