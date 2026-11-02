import { PLACE_CATEGORY } from '../../enums/place-category.js'
import { PLACE_SORT_COLUMNS } from '../../records/sort-columns.js'
import { Rule, z } from '../../validator.js'

/** What `GET /storefront/places` accepts in the query: the tab of the guide (`category`) and the order. */
export const StorefrontPlacePaginateValidator = z.object({
  ...Rule.paginationFields(),
  category: Rule.optional(z.enum(PLACE_CATEGORY)),
  ...Rule.sortFields(PLACE_SORT_COLUMNS),
})

export type StorefrontPlacePaginatePayload = z.infer<
  typeof StorefrontPlacePaginateValidator
>
