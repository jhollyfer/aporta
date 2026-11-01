import type { Listing, ListingPeriod, ListingType } from '@aporta/shared'

/**
 * O que a pessoa escolheu na busca. `null` é "qualquer um", e é o valor que
 * some da URL: filtro que não restringe nada não polui o endereço compartilhado.
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

/** Dias em que a diária equivale ao mês, para comparar hotel com kitnet na mesma faixa de preço. */
const DAYS_PER_MONTH = 30

/**
 * O preço que entra na faixa do filtro, sempre em reais por mês.
 *
 * Hotel anuncia diária, e comparar R$ 160 com R$ 900 sem converter faria todo
 * hotel parecer o imóvel mais barato da lista. A conversão é só para ordenar e
 * filtrar: o card mostra o valor na unidade em que o dono o anunciou.
 */
export function monthlyEquivalent(listing: Listing): number {
  const { monthly, daily } = listing.price
  if (monthly !== null) return monthly
  if (daily !== null) return daily * DAYS_PER_MONTH
  return 0
}

function matches(listing: Listing, filters: ListingFilters): boolean {
  const price = monthlyEquivalent(listing)
  const checks: ReadonlyArray<boolean> = [
    filters.type === null || listing.type === filters.type,
    filters.neighborhood === null ||
      listing.neighborhood === filters.neighborhood,
    filters.period === null || listing.periods.includes(filters.period),
    filters.minPrice === null || price >= filters.minPrice,
    filters.maxPrice === null || price <= filters.maxPrice,
  ]

  return checks.every(Boolean)
}

export function filterListings(
  listings: ReadonlyArray<Listing>,
  filters: ListingFilters,
): ReadonlyArray<Listing> {
  return listings.filter((listing) => matches(listing, filters))
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
