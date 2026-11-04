import { describe, expect, it } from 'vitest'

import { movePhoto } from '#/lib/photo-order'

const IDS = ['a', 'b', 'c']

describe('movePhoto', () => {
  it('quando sobe, troca o item com o anterior', () => {
    expect(movePhoto(IDS, 1, 'up')).toEqual(['b', 'a', 'c'])
  })

  it('quando desce, troca o item com o seguinte', () => {
    expect(movePhoto(IDS, 1, 'down')).toEqual(['a', 'c', 'b'])
  })

  it('quando a primeira sobe ou a última desce, não há movimento', () => {
    expect(movePhoto(IDS, 0, 'up')).toBeUndefined()
    expect(movePhoto(IDS, 2, 'down')).toBeUndefined()
  })

  it('quando o índice está fora da lista, não há movimento', () => {
    expect(movePhoto(IDS, -1, 'down')).toBeUndefined()
    expect(movePhoto(IDS, 3, 'up')).toBeUndefined()
    expect(movePhoto([], 0, 'down')).toBeUndefined()
  })

  it('não altera a lista recebida', () => {
    movePhoto(IDS, 0, 'down')

    expect(IDS).toEqual(['a', 'b', 'c'])
  })
})
