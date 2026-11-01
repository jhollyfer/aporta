import * as React from 'react'

import { cn } from '#/lib/cn'

import { StepperContext } from './stepper-context'
import type { StepperStep } from './stepper-context'

type StepperRootProps = {
  steps: ReadonlyArray<StepperStep>
  current: number
  onCurrentChange: (index: number) => void
  className?: string
  children: React.ReactNode
}

/**
 * O formulário em etapas do cadastro do imóvel. Controlado: quem usa guarda a
 * etapa (no rascunho, para o F5 voltar ao mesmo passo) e o `Stepper` cuida do
 * indicador e da navegação. Cadastro longo em uma tela só é o que faz o dono do
 * imóvel desistir no meio.
 */
export function StepperRoot({
  steps,
  current,
  onCurrentChange,
  className,
  children,
}: StepperRootProps): React.JSX.Element {
  const value = React.useMemo(
    () => ({ steps, current, go: onCurrentChange }),
    [steps, current, onCurrentChange],
  )

  return (
    <StepperContext value={value}>
      <div data-slot="stepper" className={cn('flex flex-col gap-6', className)}>
        {children}
      </div>
    </StepperContext>
  )
}
