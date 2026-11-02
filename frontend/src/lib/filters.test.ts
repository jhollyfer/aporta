import { describe, expect, it } from 'vitest'

import { EMPTY_FILTERS, activeFilterCount } from '#/lib/filters'

describe('activeFilterCount', () => {
  it('quando nada restringe, é zero', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0)
  })

  it('quando tipo, bairro e período restringem, conta um por filtro', () => {
    expect(
      activeFilterCount({
        ...EMPTY_FILTERS,
        type: 'KITNET',
        neighborhood: 'centro',
        period: 'SEMESTER',
      }),
    ).toBe(3)
  })

  it('quando só o mínimo ou só o máximo de preço está preenchido, a faixa conta uma vez', () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, minPrice: 500 })).toBe(1)
    expect(activeFilterCount({ ...EMPTY_FILTERS, maxPrice: 900 })).toBe(1)
  })

  it('quando mínimo e máximo estão preenchidos, a faixa conta uma vez só', () => {
    expect(
      activeFilterCount({ ...EMPTY_FILTERS, minPrice: 500, maxPrice: 900 }),
    ).toBe(1)
  })

  it('quando o preço mínimo é zero, ainda é um filtro aplicado', () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, minPrice: 0 })).toBe(1)
  })
})
