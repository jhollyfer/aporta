import type { ListingPeriod, ListingType } from '@aporta/shared'

/**
 * O que a pessoa escolheu na busca. `null` é "qualquer um", e é o valor que
 * some da URL: filtro que não restringe nada não polui o endereço compartilhado.
 *
 * Quem aplica o filtro é o servidor (`GET /storefront/listings`); aqui só mora o
 * que a tela precisa para desenhar a barra.
 */
export type ListingFilters = {
  type: ListingType | null
  neighborhood: string | null
  period: ListingPeriod | null
  minPrice: number | null
  maxPrice: number | null
}

export const EMPTY_FILTERS: ListingFilters = {
  type: null,
  neighborhood: null,
  period: null,
  minPrice: null,
  maxPrice: null,
}

/** Quantos filtros restringem de verdade, para o contador do botão "Limpar". */
export function activeFilterCount(filters: ListingFilters): number {
  const priceRange = filters.minPrice !== null || filters.maxPrice !== null
  const flags: ReadonlyArray<boolean> = [
    filters.type !== null,
    filters.neighborhood !== null,
    filters.period !== null,
    priceRange,
  ]

  return flags.filter(Boolean).length
}
