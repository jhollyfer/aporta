import { z } from 'zod'

import { LISTING_PERIOD, LISTING_TYPE } from '@aporta/shared'

import { NEIGHBORHOODS } from '#/lib/data/neighborhoods'
import { EMPTY_FILTERS } from '#/lib/filters'
import type { ListingFilters } from '#/lib/filters'

export const LISTINGS_VIEW = { LIST: 'list', MAP: 'map' } as const

export type ListingsView = (typeof LISTINGS_VIEW)[keyof typeof LISTINGS_VIEW]

/** A vista que o botão flutuante alterna para: lookup, não ternário. */
export const NEXT_VIEW: Record<ListingsView, ListingsView> = {
  list: LISTINGS_VIEW.MAP,
  map: LISTINGS_VIEW.LIST,
}

/**
 * O estado da listagem na URL: filtro, vista e pin selecionado. Quem abre o link
 * que alguém mandou vê a mesma lista, e o F5 não perde a busca.
 *
 * Cada campo leva `.catch(undefined)`: endereço colado errado (`?type=castelo`)
 * vira "sem filtro" em vez de derrubar a página com a tela de erro do router.
 * `bairro` é conferido contra a lista real pelo mesmo motivo.
 */
export const listingsSearchSchema = z.object({
  type: z.enum(LISTING_TYPE).optional().catch(undefined),
  neighborhood: z
    .string()
    .refine((slug) => NEIGHBORHOODS.some((item) => item.slug === slug))
    .optional()
    .catch(undefined),
  period: z.enum(LISTING_PERIOD).optional().catch(undefined),
  min: z.number().int().nonnegative().optional().catch(undefined),
  max: z.number().int().nonnegative().optional().catch(undefined),
  view: z.enum(LISTINGS_VIEW).optional().catch(undefined),
  selected: z.string().optional().catch(undefined),
})

export type ListingsSearch = z.infer<typeof listingsSearchSchema>

export function toFilters(search: ListingsSearch): ListingFilters {
  return {
    type: search.type ?? EMPTY_FILTERS.type,
    neighborhood: search.neighborhood ?? EMPTY_FILTERS.neighborhood,
    period: search.period ?? EMPTY_FILTERS.period,
    minPrice: search.min ?? EMPTY_FILTERS.minPrice,
    maxPrice: search.max ?? EMPTY_FILTERS.maxPrice,
  }
}

/** O filtro que mudou volta para a URL, e `null` vira `undefined`: filtro que não restringe some do endereço. */
export function toSearchPatch(patch: Partial<ListingFilters>): ListingsSearch {
  const next: ListingsSearch = {}
  if ('type' in patch) next.type = patch.type ?? undefined
  if ('neighborhood' in patch) {
    next.neighborhood = patch.neighborhood ?? undefined
  }
  if ('period' in patch) next.period = patch.period ?? undefined
  if ('minPrice' in patch) next.min = patch.minPrice ?? undefined
  if ('maxPrice' in patch) next.max = patch.maxPrice ?? undefined
  return next
}
