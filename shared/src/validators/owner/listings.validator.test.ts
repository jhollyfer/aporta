import { describe, expect, it } from 'vitest'

import {
  OwnerListingCreateValidator,
  OwnerListingPaginateValidator,
  OwnerListingUpdateValidator,
} from './listings.validator.js'
import { LISTING_PERIOD } from '../../enums/listing-period.js'
import { LISTING_TYPE } from '../../enums/listing-type.js'
import { ValidationFixture } from '../../validation-fixtures.js'

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

describe('OwnerListingCreateValidator (rules)', () => {
  it('aceita as regras em branco ou ausentes, como o formulário as envia', () => {
    expect(
      OwnerListingCreateValidator.safeParse({ ...VALID, rules: '' }).success,
    ).toBe(true)
    expect(
      OwnerListingCreateValidator.safeParse({ ...VALID, rules: undefined })
        .success,
    ).toBe(true)
  })

  it('recusa as regras acima do teto', () => {
    expect(
      OwnerListingCreateValidator.safeParse({
        ...VALID,
        rules: 'x'.repeat(601),
      }).success,
    ).toBe(false)
  })
})

describe('OwnerListingCreateValidator (rooms)', () => {
  it('aceita quartos e banheiros opcionais', () => {
    expect(
      OwnerListingCreateValidator.safeParse({
        ...VALID,
        bedrooms: 2,
        bathrooms: 1,
      }).success,
    ).toBe(true)
  })

  it('recusa quartos fracionados ou acima do teto', () => {
    const result = OwnerListingCreateValidator.safeParse({
      ...VALID,
      bedrooms: 1.5,
      bathrooms: 21,
    })

    expect(ValidationFixture.fields(result)).toEqual(['bathrooms', 'bedrooms'])
  })
})

describe('OwnerListingUpdateValidator', () => {
  it('aceita um corpo vazio, porque campo ausente é "não mexer"', () => {
    expect(OwnerListingUpdateValidator.safeParse({}).success).toBe(true)
  })

  it('trata o texto em branco como ausente', () => {
    const result = OwnerListingUpdateValidator.parse({ title: '', daily: '' })

    expect(result.title).toBeUndefined()
    expect(result.daily).toBeUndefined()
  })

  it('mantém os tetos da criação, campo a campo', () => {
    const result = OwnerListingUpdateValidator.safeParse({
      monthly: 900_000,
      periods: [],
      description: 'x'.repeat(601),
    })

    expect(ValidationFixture.fields(result)).toEqual([
      'description',
      'monthly',
      'periods',
    ])
  })

  it('não declara o papel, o estado nem o dono: o corpo não escolhe quem é o dono', () => {
    const parsed = OwnerListingUpdateValidator.parse({
      title: 'Kitnet perto do porto',
      status: 'PUBLISHED',
      ownerId: '00000000-0000-4000-8000-000000000001',
    })

    expect(parsed).not.toHaveProperty('status')
    expect(parsed).not.toHaveProperty('ownerId')
  })
})

describe('OwnerListingPaginateValidator', () => {
  it('aceita a página, o estado e a ordenação', () => {
    const result = OwnerListingPaginateValidator.safeParse({
      page: 2,
      status: 'PENDING',
      sort: 'price',
      direction: 'asc',
    })

    expect(result.success).toBe(true)
  })

  it('recusa estado e coluna fora da lista fechada', () => {
    const result = OwnerListingPaginateValidator.safeParse({
      status: 'DELETED',
      sort: 'ownerWhatsapp',
    })

    expect(ValidationFixture.fields(result)).toEqual(['sort', 'status'])
  })
})
