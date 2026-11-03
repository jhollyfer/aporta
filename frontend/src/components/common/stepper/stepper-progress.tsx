import * as React from 'react'

import { Progress } from '#/components/ui/progress'
import { m } from '#/paraglide/messages'
import { cn } from '#/lib/cn'

import { useStepper } from './stepper-context'

/**
 * O indicador de progresso: a barra mostra o quanto falta, a lista nomeia as
 * etapas. `aria-current="step"` marca a atual para o leitor de tela, e o texto
 * "Etapa 2 de 6" diz o mesmo para quem não vê a barra.
 */
export function StepperProgress(): React.JSX.Element {
  const { steps, current } = useStepper()
  const percent = Math.round(((current + 1) / steps.length) * 100)

  return (
    <div data-slot="stepper-progress" className="flex flex-col gap-3">
      <p className="text-sm font-bold text-ink">
        {m.stepper_status({ current: current + 1, total: steps.length })}
      </p>
      <Progress
        value={percent}
        aria-label={m.stepper_progress_label()}
        className="gap-0"
      />
      <ol className="rail hidden gap-4 overflow-x-auto sm:flex">
        {steps.map((step, index) => (
          <li
            key={step.id}
            aria-current={index === current && 'step'}
            className={cn(
              'shrink-0 text-sm text-ink-soft',
              index === current && 'font-bold text-ink',
            )}
          >
            {step.label}
          </li>
        ))}
      </ol>
    </div>
  )
}
