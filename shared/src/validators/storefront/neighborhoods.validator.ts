import { NEIGHBORHOOD_SORT_COLUMNS } from '../../records/sort-columns.js'
import { Rule, z } from '../../validator.js'

/** What `GET /storefront/neighborhoods` accepts in the query: page, search and order. */
export const StorefrontNeighborhoodPaginateValidator = z.object({
  ...Rule.paginationFields(),
  ...Rule.sortFields(NEIGHBORHOOD_SORT_COLUMNS),
})

export type StorefrontNeighborhoodPaginatePayload = z.infer<
  typeof StorefrontNeighborhoodPaginateValidator
>
