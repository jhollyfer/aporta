import { LISTING_PERIOD } from '../../enums/listing-period.js'
import { LISTING_TYPE } from '../../enums/listing-type.js'
import { LISTING_SORT_COLUMNS } from '../../records/sort-columns.js'
import { Rule, z } from '../../validator.js'

/**
 * What `GET /storefront/listings` accepts in the query. **No `status` or `trashed`**: the
 * public read only ever sees the published ones, and declaring the parameter would make the
 * OpenAPI promise a filter that does not exist.
 *
 * The price range is in whole reais with the same `100_000` ceiling as the owner's form, and it
 * compares against the monthly equivalent of the price (`LISTING_SORT_COLUMNS`). The
 * neighborhood is its `slug`, the address the storefront URL carries. `minLng`, `minLat`, `maxLng`
 * and `maxLat` are the map window (all four or none): only what falls inside it comes back, and
 * the order and the pagination keep working inside the window.
 */
export const StorefrontListingPaginateValidator = z
  .object({
    ...Rule.paginationFields(),
    ...Rule.boundsFields(),
    type: Rule.optional(z.enum(LISTING_TYPE)),
    neighborhood: Rule.optional(z.string().trim().min(1).max(60)),
    period: Rule.optional(z.enum(LISTING_PERIOD)),
    minPrice: Rule.optional(z.number().int().min(0).max(100_000)),
    maxPrice: Rule.optional(z.number().int().min(0).max(100_000)),
    ...Rule.sortFields(LISTING_SORT_COLUMNS),
  })
  .refine(...Rule.boundsComplete())

/**
 * What `GET /storefront/listings/pins` accepts: the same filters and the same map window as the
 * catalog, and **no** `page`, `perPage` or `sort`. The map draws every pin of the window at once
 * (up to `LISTING_PINS_LIMIT`, in the response file), so a page would be the wrong shape, and an order means nothing
 * to a set of points.
 */
export const StorefrontListingPinsValidator = z
  .object({
    search: Rule.paginationFields().search,
    ...Rule.boundsFields(),
    type: Rule.optional(z.enum(LISTING_TYPE)),
    neighborhood: Rule.optional(z.string().trim().min(1).max(60)),
    period: Rule.optional(z.enum(LISTING_PERIOD)),
    minPrice: Rule.optional(z.number().int().min(0).max(100_000)),
    maxPrice: Rule.optional(z.number().int().min(0).max(100_000)),
  })
  .refine(...Rule.boundsComplete())

/** What `GET /storefront/listings/:slug` receives: the public address of the ad. */
export const StorefrontListingShowValidator = z.object({
  slug: z.string().trim().min(1).max(100),
})

export type StorefrontListingPaginatePayload = z.infer<
  typeof StorefrontListingPaginateValidator
>
export type StorefrontListingPinsPayload = z.infer<
  typeof StorefrontListingPinsValidator
>
export type StorefrontListingShowPayload = z.infer<
  typeof StorefrontListingShowValidator
>
