import { createContext, use } from 'react'

export const SEARCH_FIELD = {
  TYPE: 'type',
  NEIGHBORHOOD: 'neighborhood',
  PERIOD: 'period',
} as const

export type SearchField = (typeof SEARCH_FIELD)[keyof typeof SEARCH_FIELD]

export type SearchValues = Record<SearchField, string>

export type SearchPillContextValue = {
  values: SearchValues
  setValue: (field: SearchField, value: string) => void
}

export const SearchPillContext = createContext<SearchPillContextValue | null>(
  null,
)

export function useSearchPill(): SearchPillContextValue {
  const value = use(SearchPillContext)
  if (value === null) {
    throw new Error('SearchPill.* só funciona dentro de <SearchPill>')
  }
  return value
}
