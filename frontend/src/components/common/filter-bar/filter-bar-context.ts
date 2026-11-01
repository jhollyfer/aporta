import { createContext, use } from 'react'

import type { ListingFilters } from '#/lib/filters'

export type FilterBarContextValue = {
  filters: ListingFilters
  /** Quantos anúncios o filtro atual deixa na lista, para o botão "Mostrar N imóveis". */
  count: number
  onChange: (patch: Partial<ListingFilters>) => void
  onClear: () => void
  onApply: () => void
}

export const FilterBarContext = createContext<FilterBarContextValue | null>(
  null,
)

export function useFilterBar(): FilterBarContextValue {
  const value = use(FilterBarContext)
  if (value === null) {
    throw new Error('FilterBar.* só funciona dentro de <FilterBar>')
  }
  return value
}
