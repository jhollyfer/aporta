import * as React from 'react'

import { m } from '#/paraglide/messages'

import { useStepper } from './stepper-context'

type StepperNavProps = {
  /**
   * Devolve `false` para barrar o avanço, depois de mostrar o erro dos campos da
   * etapa. Assíncrono porque a validação do formulário é uma promessa.
   */
  onBeforeNext: () => Promise<boolean>
  onSubmit: () => void
}

/** Voltar nunca valida (não se pune quem corrige o passo anterior); avançar, sim. */
export function StepperNav({
  onBeforeNext,
  onSubmit,
}: StepperNavProps): React.JSX.Element {
  const { steps, current, go } = useStepper()
  const last = current === steps.length - 1

  async function handleNext() {
    if (!(await onBeforeNext())) return
    if (last) {
      onSubmit()
      return
    }
    go(current + 1)
  }

  return (
    <div
      data-slot="stepper-nav"
      className="flex items-center justify-between gap-3"
    >
      <button
        type="button"
        onClick={() => go(current - 1)}
        disabled={current === 0}
        className="h-12 rounded-full px-5 text-sm font-bold text-ink underline underline-offset-4 disabled:opacity-40"
      >
        {m.stepper_back()}
      </button>
      <button
        type="button"
        onClick={() => void handleNext()}
        className="h-12 rounded-full bg-moss px-7 text-sm font-extrabold text-paper hover:bg-moss-deep"
      >
        {last && m.stepper_submit()}
        {!last && m.stepper_next()}
      </button>
    </div>
  )
}
