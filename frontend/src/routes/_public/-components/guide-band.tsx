import * as React from 'react'

import { PillButton } from '#/components/common/pill-button'
import { Scene, SCENE_KIND } from '#/components/common/scene'
import { m } from '#/paraglide/messages'

/** A chamada do guia: a cidade para quem acabou de chegar, com o festival como gancho para o turista. */
export function GuideBand(): React.JSX.Element {
  return (
    <section
      aria-labelledby="guide-title"
      className="mx-auto mt-28 grid max-w-6xl items-center gap-8 px-4 md:grid-cols-2"
    >
      <div className="aspect-[4/3] overflow-hidden rounded-card">
        <Scene kind={SCENE_KIND.HOUSE} label={m.guide_band_scene_label()} />
      </div>
      <div className="flex flex-col gap-5">
        <h2
          id="guide-title"
          className="text-title font-extrabold tracking-tight text-ink"
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
    </section>
  )
}
