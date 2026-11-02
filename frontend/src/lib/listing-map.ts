import type { StorefrontListingPinsPayload } from '@aporta/shared'

/** Dias em que a diária equivale ao mês, só para o rótulo do pin de hotel. */
const DAYS_PER_MONTH = 30

/** Casas decimais da janela do mapa: 0,001 grau são cerca de 110 m na linha do equador. */
const WINDOW_DECIMALS = 3

export type MapWindow = Required<
  Pick<StorefrontListingPinsPayload, 'minLng' | 'minLat' | 'maxLng' | 'maxLat'>
>

/** Os quatro cantos como o Leaflet os entrega (`getWest`, `getSouth`, `getEast`, `getNorth`). */
export type MapCorners = {
  west: number
  south: number
  east: number
  north: number
}

function clamp(value: number, limit: number): number {
  return Math.min(Math.max(value, -limit), limit)
}

function floorTo(value: number): number {
  const factor = 10 ** WINDOW_DECIMALS
  return Number((Math.floor(value * factor) / factor).toFixed(WINDOW_DECIMALS))
}

function ceilTo(value: number): number {
  const factor = 10 ** WINDOW_DECIMALS
  return Number((Math.ceil(value * factor) / factor).toFixed(WINDOW_DECIMALS))
}

/**
 * A janela visível arredondada **para fora** (mínimos para baixo, máximos para cima).
 *
 * É a chave de cache da consulta de pins: sem arredondar, cada pixel de arrasto seria um
 * quadro novo, e o cache nunca acertaria. Para fora e não para o mais próximo, para o
 * arredondamento nunca esconder um pin que está dentro do que a pessoa vê. Os limites do
 * mundo (±180, ±90) são o que o validator da API aceita; o Leaflet passa deles quando o
 * mapa é arrastado para além da dobra do planisfério.
 */
export function roundWindow(corners: MapCorners): MapWindow {
  return {
    minLng: clamp(floorTo(corners.west), 180),
    minLat: clamp(floorTo(corners.south), 90),
    maxLng: clamp(ceilTo(corners.east), 180),
    maxLat: clamp(ceilTo(corners.north), 90),
  }
}

export function sameWindow(a: MapWindow | null, b: MapWindow): boolean {
  if (a === null) return false

  return (
    a.minLng === b.minLng &&
    a.minLat === b.minLat &&
    a.maxLng === b.maxLng &&
    a.maxLat === b.maxLat
  )
}

/**
 * O valor que o pin mostra: o mensal, ou a diária vezes 30 quando o dono só anuncia a
 * diária (hotel). Sem a conversão, o pin do hotel diria R$ 160 ao lado de kitnets de
 * R$ 900 e pareceria o imóvel mais barato do mapa. O card mostra o valor na unidade
 * em que o dono anunciou; esta conta é só do rótulo.
 */
export function pinPrice(price: {
  monthly: number | null
  daily: number | null
}): number {
  if (price.monthly !== null) return price.monthly
  if (price.daily !== null) return price.daily * DAYS_PER_MONTH
  return 0
}
