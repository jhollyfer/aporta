import * as React from 'react'

import { ActionButton } from '#/components/common/action-button'
import { m } from '#/paraglide/messages'

import { useStepper } from './stepper-context'

type StepperNavProps = {
  /**
   * Devolve `false` para barrar o avanço, depois de mostrar o erro dos campos da
   * etapa. Assíncrono porque a validação do formulário é uma promessa.
   */
  onBeforeNext: () => Promise<boolean>
  onSubmit: () => void
  /** Envio em andamento: desabilita o botão e o anuncia, para o toque duplo não enviar duas vezes. */
  pending?: boolean
}

/** Voltar nunca valida (não se pune quem corrige o passo anterior); avançar, sim. */
export function StepperNav({
  onBeforeNext,
  onSubmit,
  pending = false,
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
      <ActionButton
        tone="link"
        onClick={() => go(current - 1)}
        disabled={current === 0}
      >
        {m.stepper_back()}
      </ActionButton>
      <ActionButton onClick={() => void handleNext()} pending={pending}>
        {pending && m.stepper_sending()}
        {!pending && last && m.stepper_submit()}
        {!pending && !last && m.stepper_next()}
      </ActionButton>
    </div>
  )
}
