import * as React from 'react'

import { m } from '#/paraglide/messages'

/**
 * Por que confiar, em três afirmações por extenso. O título fica numa coluna estreita ao
 * lado da lista (no celular, acima), e as linhas são separadas por fio, não por três
 * colunas iguais: a promessa é o que o grupo de WhatsApp não cumpre (dono que responde,
 * anúncio atualizado, valor sem surpresa), e o texto é quem a carrega.
 */
export function Trust(): React.JSX.Element {
  const items = [
    { title: m.trust_direct_title(), text: m.trust_direct_text() },
    { title: m.trust_verified_title(), text: m.trust_verified_text() },
    { title: m.trust_clear_title(), text: m.trust_clear_text() },
  ]

  return (
    <section
      aria-labelledby="trust-title"
      className="mx-auto mt-24 grid max-w-6xl gap-8 px-4 md:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] md:gap-16"
    >
      <h2
        id="trust-title"
        className="text-title font-extrabold tracking-tight text-balance text-ink md:sticky md:top-24 md:self-start"
      >
        {m.trust_title()}
      </h2>
      <dl className="flex flex-col gap-10">
        {items.map((item) => (
          <div key={item.title} className="flex flex-col gap-1.5">
            <dt className="text-xl font-extrabold text-moss-deep">
              {item.title}
            </dt>
            <dd className="text-ink-soft">{item.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
