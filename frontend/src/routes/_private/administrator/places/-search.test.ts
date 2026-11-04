import { describe, expect, it } from 'vitest'

import { PLACE_CATEGORY, TRASHED_MODE } from '@aporta/shared'

import { PLACES_PER_PAGE, placesSearchSchema, toPlacesParams } from './-search'

describe('placesSearchSchema', () => {
  it('aceita a aba, os arquivados, a página e a busca', () => {
    expect(
      placesSearchSchema.parse({
        category: PLACE_CATEGORY.EVENT,
        archived: true,
        page: 2,
        q: ' tacacá ',
      }),
    ).toEqual({
      category: PLACE_CATEGORY.EVENT,
      archived: true,
      page: 2,
      q: 'tacacá',
    })
  })

  it('descarta o que veio errado em vez de falhar', () => {
    expect(
      placesSearchSchema.parse({
        category: 'castelo',
        archived: 'sim',
        page: -3,
      }),
    ).toEqual({
      category: undefined,
      archived: undefined,
      page: undefined,
    })
  })
})

describe('toPlacesParams', () => {
  it('sem arquivados, não manda `trashed`: a API devolve só o que está no guia', () => {
    expect(toPlacesParams({})).toEqual({
      category: undefined,
      trashed: undefined,
      page: undefined,
      search: undefined,
      perPage: PLACES_PER_PAGE,
    })
  })

  it('com arquivados, pede só a lixeira', () => {
    expect(
      toPlacesParams({
        archived: true,
        category: PLACE_CATEGORY.EAT,
        q: 'peixe',
      }),
    ).toMatchObject({
      trashed: TRASHED_MODE.ONLY,
      category: PLACE_CATEGORY.EAT,
      search: 'peixe',
    })
  })
})
