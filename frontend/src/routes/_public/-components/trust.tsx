import * as React from 'react'

import { m } from '#/paraglide/messages'

/**
 * Por que confiar, em três afirmações escritas por extenso. Sem ícone sobre
 * cada uma: a promessa é o que o grupo de WhatsApp não cumpre (dono que
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
        className="max-w-2xl text-3xl font-extrabold tracking-tight text-ink sm:text-5xl"
      >
        {m.trust_title()}
      </h2>
      <div className="grid gap-10 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-extrabold text-moss-deep">
            {m.trust_direct_title()}
          </h3>
          <p className="text-ink-soft">{m.trust_direct_text()}</p>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-extrabold text-moss-deep">
            {m.trust_verified_title()}
          </h3>
          <p className="text-ink-soft">{m.trust_verified_text()}</p>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-extrabold text-moss-deep">
            {m.trust_clear_title()}
          </h3>
          <p className="text-ink-soft">{m.trust_clear_text()}</p>
        </div>
      </div>
    </section>
  )
}
