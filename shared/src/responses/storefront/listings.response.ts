import { LISTING_PERIODS } from '../../enums/listing-period.js'
import { LISTING_TYPES } from '../../enums/listing-type.js'
import { PHOTO_ENVIRONMENTS } from '../../enums/photo-environment.js'
import { z } from '../../validator.js'
import { ResponseRule } from '../envelope.js'
import { StorefrontNeighborhoodRef } from './neighborhoods.response.js'

/**
 * The listing as the visitor reads it, field by field. The shape is the `Listing` record of
 * `records/listing.ts` with the neighborhood as `{ slug, name }` (the card needs the name) and the
 * two stamps added.
 *
 * Closed on purpose, and it never carries `status`, `deletedAt` nor the neighborhood's key:
 * only what is published reaches here, and what describes the editing is the panel's.
 *
 * `photos[].url` is nullable: `null` is "no photo yet", and the frontend draws the environment
 * instead. `owner.updatedAt` is the day the owner last touched the ad (`YYYY-MM-DD`): a stale
 * listing is an already-rented property or a scam.
 */
export const StorefrontListingShowResponse = z.object({
  id: z.uuid(),
  slug: z.string(),
  type: z.enum(LISTING_TYPES),
  title: z.string(),
  description: z.string(),
  neighborhood: StorefrontNeighborhoodRef,
  address: z.string(),
  price: z.object({
    monthly: z.number().nullable(),
    daily: z.number().nullable(),
  }),
  costs: z.object({
    water: z.boolean(),
    electricity: z.boolean(),
    internet: z.boolean(),
  }),
  periods: z.array(z.enum(LISTING_PERIODS)),
  minimumStayMonths: z.number(),
  availableFrom: z.iso.date(),
  bedrooms: z.number(),
  bathrooms: z.number(),
  furnished: z.boolean(),
  rules: z.array(z.string()),
  photos: z.array(
    z.object({
      id: z.uuid(),
      environment: z.enum(PHOTO_ENVIRONMENTS),
      url: z.string().nullable(),
    }),
  ),
  owner: z.object({
    name: z.string(),
    verified: z.boolean(),
    whatsapp: z.string(),
    updatedAt: z.iso.date(),
  }),
  lat: z.number(),
  lng: z.number(),
  createdAt: ResponseRule.datetime(),
  updatedAt: ResponseRule.datetime(),
})

export type StorefrontListingShowResponse = z.infer<
  typeof StorefrontListingShowResponse
>

export const StorefrontListingPaginateResponse = ResponseRule.paginated(
  StorefrontListingShowResponse,
)

export type StorefrontListingPaginateResponse = z.infer<
  typeof StorefrontListingPaginateResponse
>

/** The most pins `GET /storefront/listings/pins` returns in one answer. */
export const LISTING_PINS_LIMIT = 500

/**
 * A point on the map: the least the pin needs to be drawn and to open the ad (`slug`). Not the
 * photos (no signed URL, so the answer can be cached), not the owner's contact.
 */
export const StorefrontListingPinResponse = z.object({
  id: z.uuid(),
  slug: z.string(),
  type: z.enum(LISTING_TYPES),
  lat: z.number(),
  lng: z.number(),
  price: z.object({
    monthly: z.number().nullable(),
    daily: z.number().nullable(),
  }),
})

export type StorefrontListingPinResponse = z.infer<
  typeof StorefrontListingPinResponse
>

/**
 * `meta.total` is how many ads match, `meta.limit` the ceiling of `data`: `total > data.length`
 * is the window holding more than the map draws, and the screen asks the visitor to zoom in.
 */
export const StorefrontListingPinsResponse = z.object({
  data: z.array(StorefrontListingPinResponse),
  meta: z.object({
    total: z.number().int().min(0),
    limit: z.number().int().min(1),
  }),
})

export type StorefrontListingPinsResponse = z.infer<
  typeof StorefrontListingPinsResponse
>
