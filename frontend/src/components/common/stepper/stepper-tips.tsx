import * as React from 'react'
import { Lightbulb } from '@phosphor-icons/react'

import { m } from '#/paraglide/messages'

/**
 * As dicas da etapa, sobretudo a das fotos: anúncio que só mostra a cama ou um
 * canto do quarto é sinal de alerta, e a dica de quais fotos tirar é o que
 * transforma o cadastro do dono no anúncio completo que o visitante confia.
 */
export function StepperTips({
  items,
}: {
  items: ReadonlyArray<string>
}): React.JSX.Element {
  return (
    <aside
      data-slot="stepper-tips"
      className="flex flex-col gap-2 rounded-card bg-sun/20 p-4"
    >
      <p className="inline-flex items-center gap-2 text-sm font-extrabold text-ink">
        <Lightbulb aria-hidden weight="fill" className="size-5" />
        {m.stepper_tips_title()}
      </p>
      <ul className="list-disc pl-5 text-sm text-ink">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </aside>
  )
}
