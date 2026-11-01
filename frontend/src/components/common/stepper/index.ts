import { StepperNav } from './stepper-nav'
import { StepperProgress } from './stepper-progress'
import { StepperRoot } from './stepper'
import { StepperStep } from './stepper-step'
import { StepperTips } from './stepper-tips'

export type { StepperStep as StepperStepItem } from './stepper-context'

export const Stepper = Object.assign(StepperRoot, {
  Progress: StepperProgress,
  Step: StepperStep,
  Tips: StepperTips,
  Nav: StepperNav,
})
