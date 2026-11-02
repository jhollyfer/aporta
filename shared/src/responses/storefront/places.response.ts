import { PLACE_CATEGORIES } from '../../enums/place-category.js'
import { z } from '../../validator.js'
import { ResponseRule } from '../envelope.js'
import { StorefrontNeighborhoodRef } from './neighborhoods.response.js'

/**
 * The guide place as the visitor reads it: the `Place` record of `records/listing.ts` with the
 * neighborhood as `{ slug, name }`. `date` is `YYYY-MM-DD` and only an event has one;
 * `whatsapp` is optional because a farmácia or a bank has no number to talk to.
 */
export const StorefrontPlaceShowResponse = z.object({
  id: z.uuid(),
  category: z.enum(PLACE_CATEGORIES),
  name: z.string(),
  description: z.string(),
  neighborhood: StorefrontNeighborhoodRef,
  address: z.string(),
  hours: z.string(),
  whatsapp: z.string().nullable(),
  date: z.iso.date().nullable(),
})

export type StorefrontPlaceShowResponse = z.infer<
  typeof StorefrontPlaceShowResponse
>

export const StorefrontPlacePaginateResponse = ResponseRule.paginated(
  StorefrontPlaceShowResponse,
)

export type StorefrontPlacePaginateResponse = z.infer<
  typeof StorefrontPlacePaginateResponse
>
