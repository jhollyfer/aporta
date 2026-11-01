import * as React from 'react'

import { useStepper } from './stepper-context'

/** O conteúdo de uma etapa: só a atual monta, então só os campos dela entram na ordem do teclado. */
export function StepperStep({
  index,
  children,
}: {
  index: number
  children: React.ReactNode
}): React.JSX.Element | null {
  const { current } = useStepper()
  if (current !== index) return null

  return (
    <div data-slot="stepper-step" className="flex flex-col gap-5">
      {children}
    </div>
  )
}
