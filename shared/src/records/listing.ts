import type { ListingPeriod } from '../enums/listing-period.js'
import type { ListingType } from '../enums/listing-type.js'
import type { PhotoEnvironment } from '../enums/photo-environment.js'
import type { PlaceCategory } from '../enums/place-category.js'

/**
 * The records both sides read: the shape of a listing, a neighborhood and a guide place. No
 * schema here (`architecture.md` §9): the response the API will send is validated in
 * `responses/`, and until the API exists the frontend's mocks are typed by these.
 */

export type Neighborhood = {
  slug: string
  name: string
  /** Approximate center of the neighborhood, for the map pin. */
  lat: number
  lng: number
}

export type ListingPhoto = {
  id: string
  environment: PhotoEnvironment
  /** `null` is "no photo yet": the frontend draws the environment instead. */
  url: string | null
}

/** What the monthly price already includes, so the card can say it before the ad is opened. */
export type ListingCosts = {
  water: boolean
  electricity: boolean
  internet: boolean
}

export type ListingOwner = {
  name: string
  verified: boolean
  /** Digits only, with the country code. */
  whatsapp: string
  /** `YYYY-MM-DD`. A stale listing is an already-rented property or a scam. */
  updatedAt: string
}

export type Listing = {
  id: string
  slug: string
  type: ListingType
  title: string
  description: string
  /** The `slug` of a `Neighborhood`. */
  neighborhood: string
  address: string
  /** In reais. A hotel quotes `daily`; the rest quote `monthly`. */
  price: { monthly: number | null; daily: number | null }
  costs: ListingCosts
  periods: ReadonlyArray<ListingPeriod>
  minimumStayMonths: number
  /** `YYYY-MM-DD`. */
  availableFrom: string
  bedrooms: number
  bathrooms: number
  furnished: boolean
  rules: ReadonlyArray<string>
  photos: ReadonlyArray<ListingPhoto>
  owner: ListingOwner
  lat: number
  lng: number
}

export type Place = {
  id: string
  category: PlaceCategory
  name: string
  description: string
  /** The `slug` of a `Neighborhood`. */
  neighborhood: string
  address: string
  hours: string
  whatsapp: string | null
  /** `YYYY-MM-DD`, only for events. */
  date: string | null
}
