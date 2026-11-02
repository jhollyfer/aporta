import { z } from 'zod'

import { LISTING_PERIOD, LISTING_TYPE } from '@aporta/shared'
import type { StorefrontListingPaginatePayload } from '@aporta/shared'

import { MAX_PER_PAGE } from '#/integrations/tanstack-query/queries/storefront'

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
 * O bairro é conferido só no formato (o mesmo teto do validator da API): a lista
 * real mora no servidor e `validateSearch` é síncrono, então um slug que não existe
 * passa e a API responde lista vazia, com a saída "limpar filtros" na tela.
 */
export const listingsSearchSchema = z.object({
  type: z.enum(LISTING_TYPE).optional().catch(undefined),
  neighborhood: z.string().trim().min(1).max(60).optional().catch(undefined),
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

/**
 * O search da URL em parâmetros da API: só o que o servidor filtra (`view` e `selected`
 * são da tela e não entram na chave de cache), com `min` e `max` nos nomes da API.
 * É a chave do `loader` e do componente, que por isso leem o mesmo cache.
 */
export function toListingParams(
  search: ListingsSearch,
): StorefrontListingPaginatePayload {
  return {
    type: search.type,
    neighborhood: search.neighborhood,
    period: search.period,
    minPrice: search.min,
    maxPrice: search.max,
    // O mapa mostra todos os pins de uma vez, então a listagem pede tudo numa página
    // só, no teto da API. Limite conhecido: acima de 100 anúncios publicados os pins
    // e os cards passam a cobrir só os 100 primeiros, e aí a listagem precisa de
    // paginação (e o mapa de uma consulta própria por área).
    perPage: MAX_PER_PAGE,
  }
}
