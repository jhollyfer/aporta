import { describe, expect, it } from 'vitest'

import {
  AdministratorPlacePaginateValidator,
  AdministratorPlaceWriteValidator,
} from './places.validator.js'
import { ValidationFixture } from '../../validation-fixtures.js'

const VALID = {
  category: 'EAT',
  name: 'Tacacá da Praça',
  description: 'Tacacá quentinho no fim da tarde.',
  neighborhood: 'centro',
  address: 'Praça da Matriz',
  hours: 'Todos os dias, 16h às 21h',
}

describe('AdministratorPlaceWriteValidator', () => {
  it('when the form is complete, it accepts it, with the number and the day optional', () => {
    expect(AdministratorPlaceWriteValidator.safeParse(VALID).success).toBe(true)
    expect(
      AdministratorPlaceWriteValidator.safeParse({
        ...VALID,
        category: 'EVENT',
        whatsapp: '',
        date: '2027-06-26',
      }).success,
    ).toBe(true)
  })

  it('when a field breaks its ceiling or its shape, it points at each one', () => {
    const result = AdministratorPlaceWriteValidator.safeParse({
      ...VALID,
      category: 'PARTY',
      name: 'a',
      hours: '',
      date: '26/06/2027',
    })

    expect(ValidationFixture.fields(result).sort()).toEqual([
      'category',
      'date',
      'hours',
      'name',
    ])
  })
})

describe('AdministratorPlacePaginateValidator', () => {
  it('when the trash slice is `only` or `with`, it accepts it; otherwise it refuses it', () => {
    expect(
      AdministratorPlacePaginateValidator.safeParse({ trashed: 'only' })
        .success,
    ).toBe(true)
    expect(
      ValidationFixture.fields(
        AdministratorPlacePaginateValidator.safeParse({ trashed: 'ONLY' }),
      ),
    ).toEqual(['trashed'])
  })
})
