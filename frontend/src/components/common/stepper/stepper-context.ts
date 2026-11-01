import { createContext, use } from 'react'

export type StepperStep = { id: string; label: string }

export type StepperContextValue = {
  steps: ReadonlyArray<StepperStep>
  current: number
  go: (index: number) => void
}

export const StepperContext = createContext<StepperContextValue | null>(null)

export function useStepper(): StepperContextValue {
  const value = use(StepperContext)
  if (value === null) {
    throw new Error('Stepper.* só funciona dentro de <Stepper>')
  }
  return value
}
