import { NEIGHBORHOOD_SORT_COLUMNS } from '@aporta/shared'

import { paginationFields, sortFields, vine } from '#core/validator'
import type { Infer } from '#core/validator'

/** What the public neighborhood listing accepts: page, size, search and order (no `trashed`). */
export const StorefrontNeighborhoodPaginateValidator = vine.create({
  ...paginationFields(),
  ...sortFields(NEIGHBORHOOD_SORT_COLUMNS),
})

export type StorefrontNeighborhoodPaginatePayload = Infer<
  typeof StorefrontNeighborhoodPaginateValidator
>
