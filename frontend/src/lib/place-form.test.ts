import { describe, expect, it } from 'vitest'

import { PLACE_CATEGORY } from '@aporta/shared'
import type { AdministratorPlaceShowResponse } from '@aporta/shared'

import { placeToForm, toPlacePayload } from './place-form'

const PLACE: AdministratorPlaceShowResponse = {
  id: '00000000-0000-4000-8000-000000000001',
  category: PLACE_CATEGORY.EVENT,
  name: 'Festival',
  description: 'Três noites de boi-bumbá.',
  neighborhood: { slug: 'centro', name: 'Centro' },
  address: 'Orla',
  hours: 'A partir das 19h',
  whatsapp: null,
  date: '2027-06-26',
  archivedAt: null,
}

describe('placeToForm', () => {
  it('troca o bairro pelo slug e o que falta por texto vazio', () => {
    expect(placeToForm({ ...PLACE, date: null })).toEqual({
      category: PLACE_CATEGORY.EVENT,
      name: 'Festival',
      description: 'Três noites de boi-bumbá.',
      neighborhood: 'centro',
      address: 'Orla',
      hours: 'A partir das 19h',
      whatsapp: '',
      date: '',
    })
  })
})

describe('toPlacePayload', () => {
  it('mantém o dia no evento', () => {
    const values = placeToForm(PLACE)

    expect(toPlacePayload(values).date).toBe('2027-06-26')
  })

  it('tira o dia de quem deixou de ser evento: a API recusa data em outra aba', () => {
    const values = { ...placeToForm(PLACE), category: PLACE_CATEGORY.EAT }

    expect(toPlacePayload(values).date).toBeUndefined()
  })
})
