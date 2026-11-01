/** The tabs of the city guide: where to eat, where to drink, what is happening, and the useful services. */
export const PLACE_CATEGORY = {
  EAT: 'EAT',
  DRINK: 'DRINK',
  EVENT: 'EVENT',
  SERVICE: 'SERVICE',
} as const

export type PlaceCategory = (typeof PLACE_CATEGORY)[keyof typeof PLACE_CATEGORY]

export const PLACE_CATEGORIES = Object.values(PLACE_CATEGORY)
