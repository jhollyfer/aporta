import {
  LISTING_PERIODS,
  LISTING_SORT_COLUMNS,
  LISTING_TYPES,
} from '@aporta/shared'

import { paginationFields, sortFields, vine } from '#core/validator'
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
  type: vine.enum(LISTING_TYPES).optional(),
  neighborhood: vine.string().trim().minLength(1).maxLength(60).optional(),
  period: vine.enum(LISTING_PERIODS).optional(),
  minPrice: vine.number().withoutDecimals().min(0).max(100_000).optional(),
  maxPrice: vine.number().withoutDecimals().min(0).max(100_000).optional(),
  ...sortFields(LISTING_SORT_COLUMNS),
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
export type StorefrontListingShowPayload = Infer<
  typeof StorefrontListingShowValidator
>
