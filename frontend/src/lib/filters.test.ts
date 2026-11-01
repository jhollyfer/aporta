import { describe, expect, it } from 'vitest'

import { LISTING_PERIOD, LISTING_TYPE } from '@aporta/shared'

import { LISTINGS } from '#/lib/data/listings'
import {
  EMPTY_FILTERS,
  activeFilterCount,
  filterListings,
  monthlyEquivalent,
} from '#/lib/filters'

describe('filterListings', () => {
  it('sem filtro devolve todos os anúncios', () => {
    expect(filterListings(LISTINGS, EMPTY_FILTERS)).toHaveLength(
      LISTINGS.length,
    )
  })

  it('filtra por tipo', () => {
    const result = filterListings(LISTINGS, {
      ...EMPTY_FILTERS,
      type: LISTING_TYPE.KITNET,
    })

    expect(result.length).toBeGreaterThan(0)
    expect(result.every((l) => l.type === LISTING_TYPE.KITNET)).toBe(true)
  })

  it('filtra por bairro', () => {
    const result = filterListings(LISTINGS, {
      ...EMPTY_FILTERS,
      neighborhood: 'centro',
    })

    expect(result.every((l) => l.neighborhood === 'centro')).toBe(true)
  })

  it('filtra por período oferecido', () => {
    const result = filterListings(LISTINGS, {
      ...EMPTY_FILTERS,
      period: LISTING_PERIOD.DAILY,
    })

    expect(result.every((l) => l.periods.includes(LISTING_PERIOD.DAILY))).toBe(
      true,
    )
  })

  it('respeita a faixa de preço nos dois extremos', () => {
    const result = filterListings(LISTINGS, {
      ...EMPTY_FILTERS,
      minPrice: 600,
      maxPrice: 900,
    })

    expect(
      result.every((l) => {
        const price = monthlyEquivalent(l)
        return price >= 600 && price <= 900
      }),
    ).toBe(true)
  })

  it('combina os filtros com E, não com OU', () => {
    const result = filterListings(LISTINGS, {
      ...EMPTY_FILTERS,
      type: LISTING_TYPE.KITNET,
      neighborhood: 'centro',
    })

    expect(
      result.every(
        (l) => l.type === LISTING_TYPE.KITNET && l.neighborhood === 'centro',
      ),
    ).toBe(true)
  })
})

describe('monthlyEquivalent', () => {
  it('usa o mensal quando existe', () => {
    const [first] = LISTINGS
    expect(first?.price.monthly).not.toBeNull()
    expect(first && monthlyEquivalent(first)).toBe(first?.price.monthly)
  })

  it('converte a diária do hotel em 30 dias', () => {
    const hotel = LISTINGS.find((l) => l.price.monthly === null)

    expect(hotel && monthlyEquivalent(hotel)).toBe(
      (hotel?.price.daily ?? 0) * 30,
    )
  })
})

describe('activeFilterCount', () => {
  it('conta a faixa de preço como um filtro só', () => {
    expect(
      activeFilterCount({ ...EMPTY_FILTERS, minPrice: 100, maxPrice: 900 }),
    ).toBe(1)
  })

  it('é zero sem filtro', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0)
  })
})
