import { describe, expect, it } from 'vitest'

import { pinPrice, roundWindow, sameWindow } from './listing-map'

describe('roundWindow', () => {
  it('arredonda para fora: o mínimo desce e o máximo sobe', () => {
    expect(
      roundWindow({
        west: -70.03126,
        south: -4.37841,
        east: -70.02871,
        north: -4.37512,
      }),
    ).toEqual({
      minLng: -70.032,
      minLat: -4.379,
      maxLng: -70.028,
      maxLat: -4.375,
    })
  })

  it('dois arrastos curtos no mesmo quadro dão a mesma chave de cache', () => {
    const first = roundWindow({
      west: -70.03126,
      south: -4.37841,
      east: -70.02871,
      north: -4.37512,
    })
    const second = roundWindow({
      west: -70.03119,
      south: -4.37833,
      east: -70.02864,
      north: -4.37505,
    })

    expect(sameWindow(first, second)).toBe(true)
  })

  it('não passa dos limites que a API aceita', () => {
    expect(
      roundWindow({ west: -200, south: -95, east: 200, north: 95 }),
    ).toEqual({ minLng: -180, minLat: -90, maxLng: 180, maxLat: 90 })
  })
})

describe('sameWindow', () => {
  it('sem janela anterior nunca é igual', () => {
    expect(
      sameWindow(null, { minLng: 0, minLat: 0, maxLng: 1, maxLat: 1 }),
    ).toBe(false)
  })
})

describe('pinPrice', () => {
  it('usa o mensal quando existe', () => {
    expect(pinPrice({ monthly: 900, daily: null })).toBe(900)
  })

  it('converte a diária do hotel em mês para o rótulo ficar comparável', () => {
    expect(pinPrice({ monthly: null, daily: 160 })).toBe(4800)
  })

  it('sem preço nenhum, zero', () => {
    expect(pinPrice({ monthly: null, daily: null })).toBe(0)
  })
})
