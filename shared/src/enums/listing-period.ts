/**
 * How long the rent runs. The periods follow the UFAM calendar (a semester, an academic year)
 * and not loose dates, because that is how whoever arrives in the city plans the stay; monthly
 * and daily cover workers and travelers.
 */
export const LISTING_PERIOD = {
  SEMESTER: 'SEMESTER',
  ACADEMIC_YEAR: 'ACADEMIC_YEAR',
  MONTHLY: 'MONTHLY',
  DAILY: 'DAILY',
} as const

export type ListingPeriod = (typeof LISTING_PERIOD)[keyof typeof LISTING_PERIOD]

export const LISTING_PERIODS = Object.values(LISTING_PERIOD)
