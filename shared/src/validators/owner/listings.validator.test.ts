import { describe, expect, it } from 'vitest'

import { OwnerListingCreateValidator } from './listings.validator.js'
import { LISTING_PERIOD } from '../../enums/listing-period.js'
import { LISTING_TYPE } from '../../enums/listing-type.js'

const VALID = {
  type: LISTING_TYPE.KITNET,
  furnished: true,
  neighborhood: 'centro',
  address: 'Rua do Porto, 120',
  monthly: 900,
  water: true,
  electricity: true,
  internet: false,
  periods: [LISTING_PERIOD.SEMESTER],
  minimumStayMonths: 4,
  title: 'Kitnet perto do porto',
  description: 'Kitnet mobiliada, com cama, geladeira e fogão.',
  rules: '',
  ownerName: 'Seu Raimundo',
  whatsapp: '5597999990001',
}

describe('OwnerListingCreateValidator', () => {
  it('aceita um anúncio completo', () => {
    expect(OwnerListingCreateValidator.safeParse(VALID).success).toBe(true)
  })

  it('recusa o aluguel com zero a mais, acima do teto', () => {
    expect(
      OwnerListingCreateValidator.safeParse({ ...VALID, monthly: 900_000 })
        .success,
    ).toBe(false)
  })

  it('exige ao menos um período', () => {
    expect(
      OwnerListingCreateValidator.safeParse({ ...VALID, periods: [] }).success,
    ).toBe(false)
  })

  it('recusa descrição acima do teto', () => {
    expect(
      OwnerListingCreateValidator.safeParse({
        ...VALID,
        description: 'x'.repeat(601),
      }).success,
    ).toBe(false)
  })
})
