import { describe, expect, it } from 'vitest'

import { LISTING_TYPE } from '@aporta/shared'

import { DEFAULT_LISTING_PER_PAGE } from '#/integrations/tanstack-query/queries/storefront'

import {
  listingsSearchSchema,
  toFilters,
  toListingParams,
  toPinFilters,
  toSearchPatch,
  withFirstPage,
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
  it('traduz min e max para os nomes da API e pede a primeira página', () => {
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
      page: undefined,
      perPage: DEFAULT_LISTING_PER_PAGE,
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
      perPage: DEFAULT_LISTING_PER_PAGE,
    })
  })

  it('leva a página e o tamanho que a URL pede', () => {
    expect(
      toListingParams(listingsSearchSchema.parse({ page: 3, perPage: 24 })),
    ).toMatchObject({ page: 3, perPage: 24 })
  })
})

describe('página na URL', () => {
  it('descarta página inválida, a primeira e tamanho fora de 12 e 24', () => {
    const parsed = listingsSearchSchema.parse({ page: 1, perPage: 100 })

    expect(parsed.page).toBeUndefined()
    expect(parsed.perPage).toBeUndefined()
    expect(listingsSearchSchema.parse({ page: 'x' }).page).toBeUndefined()
    expect(listingsSearchSchema.parse({ page: -4 }).page).toBeUndefined()
  })

  it('aceita a página 2 e o tamanho 24', () => {
    expect(listingsSearchSchema.parse({ page: 2, perPage: 24 })).toMatchObject({
      page: 2,
      perPage: 24,
    })
  })

  it('mudar o filtro volta à primeira página sem perder o resto', () => {
    const next = withFirstPage(
      listingsSearchSchema.parse({ page: 4, type: 'ROOM' }),
    )

    expect(next.page).toBeUndefined()
    expect(next.type).toBe('ROOM')
  })
})

describe('toPinFilters', () => {
  it('leva só o filtro: nem página nem tamanho vão para o mapa', () => {
    const filters = toPinFilters(
      listingsSearchSchema.parse({
        type: 'ROOM',
        page: 3,
        max: 700,
        view: 'map',
      }),
    )

    expect(filters).toEqual({
      type: 'ROOM',
      neighborhood: undefined,
      period: undefined,
      minPrice: undefined,
      maxPrice: 700,
    })
  })
})
