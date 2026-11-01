import { createContext, use } from 'react'

import type { ListingType } from '@aporta/shared'

export type CategoryRailContextValue = {
  active: ListingType | null
}

export const CategoryRailContext =
  createContext<CategoryRailContextValue | null>(null)

export function useCategoryRail(): CategoryRailContextValue {
  const value = use(CategoryRailContext)
  if (value === null) {
    throw new Error('CategoryRail.* só funciona dentro de <CategoryRail>')
  }
  return value
}
