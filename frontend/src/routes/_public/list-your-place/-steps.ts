import type { OwnerListingCreate } from '@aporta/shared'

import { m } from '#/paraglide/messages'

/**
 * As etapas do cadastro, com os campos que cada uma valida antes de avançar.
 * Mora na rota (`-steps.ts`) e não em `lib/` porque só ela a lê. Os campos são
 * as chaves do `OwnerListingCreate` do `shared/`: a mesma forma que o rascunho grava e
 * que a API receberá.
 */
export type StepSpec = {
  id: string
  label: () => string
  fields: ReadonlyArray<keyof OwnerListingCreate>
}

export const STEPS: ReadonlyArray<StepSpec> = [
  { id: 'type', label: () => m.step_type(), fields: ['type', 'furnished'] },
  {
    id: 'place',
    label: () => m.step_place(),
    fields: ['neighborhood', 'address'],
  },
  {
    id: 'values',
    label: () => m.step_values(),
    fields: [
      'monthly',
      'daily',
      'water',
      'electricity',
      'internet',
      'periods',
      'minimumStayMonths',
    ],
  },
  { id: 'photos', label: () => m.step_photos(), fields: [] },
  {
    id: 'rules',
    label: () => m.step_rules(),
    fields: ['title', 'description', 'rules'],
  },
  {
    id: 'contact',
    label: () => m.step_contact(),
    fields: ['ownerName', 'whatsapp'],
  },
]
