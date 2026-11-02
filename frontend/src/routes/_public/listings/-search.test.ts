import { describe, expect, it } from 'vitest'

import { LISTING_TYPE } from '@aporta/shared'

import { MAX_PER_PAGE } from '#/integrations/tanstack-query/queries/storefront'

import {
  listingsSearchSchema,
  toFilters,
  toListingParams,
  toSearchPatch,
} from './-search'

describe('listingsSearchSchema', () => {
  it('aceita um tipo válido', () => {
    expect(listingsSearchSchema.parse({ type: LISTING_TYPE.KITNET }).type).toBe(
      LISTING_TYPE.KITNET,
    )
  })

  it('descarta tipo inválido em vez de falhar', () => {
    expect(listingsSearchSchema.parse({ type: 'castelo' }).type).toBeUndefined()
  })

  it('descarta bairro vazio ou maior que o teto da API', () => {
    expect(
      listingsSearchSchema.parse({ neighborhood: '' }).neighborhood,
    ).toBeUndefined()
    expect(
      listingsSearchSchema.parse({ neighborhood: 'x'.repeat(61) }).neighborhood,
    ).toBeUndefined()
  })

  it('mantém o slug de um bairro, e quem confere se existe é a API', () => {
    expect(
      listingsSearchSchema.parse({ neighborhood: 'centro' }).neighborhood,
    ).toBe('centro')
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

describe('toListingParams', () => {
  it('traduz min e max para os nomes da API e pede a página inteira', () => {
    const search = listingsSearchSchema.parse({
      type: 'ROOM',
      neighborhood: 'centro',
      period: 'MONTHLY',
      min: 300,
      max: 700,
    })

    expect(toListingParams(search)).toEqual({
      type: 'ROOM',
      neighborhood: 'centro',
      period: 'MONTHLY',
      minPrice: 300,
      maxPrice: 700,
      perPage: MAX_PER_PAGE,
    })
  })

  it('não carrega o que é só da tela (vista e pin selecionado)', () => {
    const params = toListingParams(
      listingsSearchSchema.parse({
        view: 'map',
        selected: 'kitnet-centro-porto',
      }),
    )

    expect(params).not.toHaveProperty('view')
    expect(params).not.toHaveProperty('selected')
  })

  it('quando nada filtra, os campos de filtro ficam indefinidos', () => {
    expect(toListingParams(listingsSearchSchema.parse({}))).toMatchObject({
      type: undefined,
      minPrice: undefined,
      perPage: MAX_PER_PAGE,
    })
  })
})
