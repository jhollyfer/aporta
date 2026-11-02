import {
  LISTING_PERIODS,
  LISTING_SORT_COLUMNS,
  LISTING_TYPES,
} from '@aporta/shared'

import {
  boundsFields,
  paginationFields,
  sortFields,
  vine,
} from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * What the public listing accepts in the query. The VineJS pair of the Zod
 * `StorefrontListingPaginateValidator` in `@aporta/shared`: the screen's filters validate with
 * that one and the API with this one, and `validators:check` fails the day the two diverge.
 *
 * **No `status` or `trashed`**: only the published ones cross the storefront
 * (`ListingRepository.paginatePublished`), and declaring the parameter would make OpenAPI promise
 * a filter that does not exist. The price range is in whole reais with the owner's form ceiling.
 */
export const StorefrontListingPaginateValidator = vine.create({
  ...paginationFields(),
  ...boundsFields(),
  type: vine.enum(LISTING_TYPES).optional(),
  neighborhood: vine.string().trim().minLength(1).maxLength(60).optional(),
  period: vine.enum(LISTING_PERIODS).optional(),
  minPrice: vine.number().withoutDecimals().min(0).max(100_000).optional(),
  maxPrice: vine.number().withoutDecimals().min(0).max(100_000).optional(),
  ...sortFields(LISTING_SORT_COLUMNS),
})

/**
 * What `GET /storefront/listings/pins` accepts: the filters and the map window of the catalog,
 * and none of `page`, `perPage` and `sort` - the map draws every pin of the window at once, up
 * to a ceiling of its own. The VineJS pair of `StorefrontListingPinsValidator` in
 * `@aporta/shared`.
 */
export const StorefrontListingPinsValidator = vine.create({
  search: paginationFields().search,
  ...boundsFields(),
  type: vine.enum(LISTING_TYPES).optional(),
  neighborhood: vine.string().trim().minLength(1).maxLength(60).optional(),
  period: vine.enum(LISTING_PERIODS).optional(),
  minPrice: vine.number().withoutDecimals().min(0).max(100_000).optional(),
  maxPrice: vine.number().withoutDecimals().min(0).max(100_000).optional(),
})

/**
 * The public address of the ad in the URL. A resource of its own and not a global
 * `SlugValidator`: the listing is the only resource of this API that is read by `slug` so far, and
 * the ceiling is the column's (`varchar(100)`).
 */
export const StorefrontListingShowValidator = vine.create({
  slug: vine.string().trim().minLength(1).maxLength(100),
})

export type StorefrontListingPaginatePayload = Infer<
  typeof StorefrontListingPaginateValidator
>
export type StorefrontListingPinsPayload = Infer<
  typeof StorefrontListingPinsValidator
>
export type StorefrontListingShowPayload = Infer<
  typeof StorefrontListingShowValidator
>
