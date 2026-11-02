import { z } from '../../validator.js'
import { ResponseRule } from '../envelope.js'

/**
 * The neighborhood as the visitor reads it: the filter's option and the map pin. Closed object,
 * by allowlist: `id` and the stamps belong to the panel.
 */
export const StorefrontNeighborhoodShowResponse = z.object({
  slug: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
})

export type StorefrontNeighborhoodShowResponse = z.infer<
  typeof StorefrontNeighborhoodShowResponse
>

export const StorefrontNeighborhoodPaginateResponse = ResponseRule.paginated(
  StorefrontNeighborhoodShowResponse,
)

export type StorefrontNeighborhoodPaginateResponse = z.infer<
  typeof StorefrontNeighborhoodPaginateResponse
>

/**
 * The neighborhood a listing or a place sits in, reduced to what a card draws. Shared by the
 * two responses, so the shape cannot drift between them.
 */
export const StorefrontNeighborhoodRef = z.object({
  slug: z.string(),
  name: z.string(),
})

export type StorefrontNeighborhoodRef = z.infer<
  typeof StorefrontNeighborhoodRef
>
