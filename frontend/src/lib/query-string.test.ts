import { describe, expect, it } from 'vitest'

import { queryString } from '#/lib/query-string'

describe('queryString', () => {
  it('quando nada foi preenchido, não devolve nem o ponto de interrogação', () => {
    expect(queryString({})).toBe('')
    expect(queryString({ type: undefined, neighborhood: '' })).toBe('')
  })

  it('quando há valores, junta só os preenchidos', () => {
    expect(queryString({ type: 'KITNET', period: undefined, perPage: 6 })).toBe(
      '?type=KITNET&perPage=6',
    )
  })

  it('quando o preço mínimo é zero, mantém o filtro', () => {
    expect(queryString({ minPrice: 0 })).toBe('?minPrice=0')
  })

  it('quando o valor tem caractere reservado, escapa', () => {
    expect(queryString({ neighborhood: 'a&b c' })).toBe('?neighborhood=a%26b+c')
  })
})
