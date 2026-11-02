import { PLACE_CATEGORIES, PLACE_SORT_COLUMNS } from '@aporta/shared'

import { paginationFields, sortFields, vine } from '#core/validator'
import type { Infer } from '#core/validator'

/** What the public guide accepts: the tab (`category`), page, size, search and order (no `trashed`). */
export const StorefrontPlacePaginateValidator = vine.create({
  ...paginationFields(),
  category: vine.enum(PLACE_CATEGORIES).optional(),
  ...sortFields(PLACE_SORT_COLUMNS),
})

export type StorefrontPlacePaginatePayload = Infer<
  typeof StorefrontPlacePaginateValidator
>
