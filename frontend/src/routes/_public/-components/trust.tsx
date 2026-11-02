import * as React from 'react'

import { m } from '#/paraglide/messages'

/**
 * Por que confiar, em três afirmações escritas por extenso. Sem ícone sobre
 * cada uma, e em linhas separadas por fio, não em três colunas iguais: a promessa é o que o grupo de WhatsApp não cumpre (dono que
 * responde, anúncio que não é golpe, valor sem surpresa), e o texto grande é
 * quem a carrega.
 */
export function Trust(): React.JSX.Element {
  return (
    <section
      aria-labelledby="trust-title"
      className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-28"
    >
      <h2
        id="trust-title"
        className="max-w-2xl text-title font-extrabold tracking-tight text-ink"
      >
        {m.trust_title()}
      </h2>
      <dl className="flex flex-col divide-y divide-line border-y border-line">
        <div className="flex flex-col gap-2 py-6 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10">
          <dt className="text-xl font-extrabold text-moss-deep">
            {m.trust_direct_title()}
          </dt>
          <dd className="text-ink-soft">{m.trust_direct_text()}</dd>
        </div>
        <div className="flex flex-col gap-2 py-6 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10">
          <dt className="text-xl font-extrabold text-moss-deep">
            {m.trust_verified_title()}
          </dt>
          <dd className="text-ink-soft">{m.trust_verified_text()}</dd>
        </div>
        <div className="flex flex-col gap-2 py-6 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10">
          <dt className="text-xl font-extrabold text-moss-deep">
            {m.trust_clear_title()}
          </dt>
          <dd className="text-ink-soft">{m.trust_clear_text()}</dd>
        </div>
      </dl>
    </section>
  )
}
