import { describe, expect, it } from 'vitest'

import { LISTING_TYPE } from '@aporta/shared'

import { listingsSearchSchema, toFilters, toSearchPatch } from './-search'

describe('listingsSearchSchema', () => {
  it('aceita um tipo válido', () => {
    expect(listingsSearchSchema.parse({ type: LISTING_TYPE.KITNET }).type).toBe(
      LISTING_TYPE.KITNET,
    )
  })

  it('descarta tipo inválido em vez de falhar', () => {
    expect(listingsSearchSchema.parse({ type: 'castelo' }).type).toBeUndefined()
  })

  it('descarta bairro que não existe', () => {
    expect(
      listingsSearchSchema.parse({ neighborhood: 'lugar-nenhum' }).neighborhood,
    ).toBeUndefined()
  })

  it('descarta preço negativo', () => {
    expect(listingsSearchSchema.parse({ min: -5 }).min).toBeUndefined()
  })
})

describe('toFilters e toSearchPatch', () => {
  it('ida e volta preservam o filtro', () => {
    const search = listingsSearchSchema.parse({ type: 'ROOM', max: 700 })
    expect(toFilters(search)).toMatchObject({ type: 'ROOM', maxPrice: 700 })
  })

  it('null no filtro vira undefined na URL', () => {
    expect(toSearchPatch({ type: null }).type).toBeUndefined()
  })

  it('só mexe nos campos que vieram no patch', () => {
    expect('min' in toSearchPatch({ type: 'ROOM' })).toBe(false)
  })
})
