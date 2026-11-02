import {
  LISTING_REVIEW_DECISIONS,
  LISTING_SORT_COLUMNS,
  LISTING_STATUSES,
  REVIEW_NOTE_MAX,
  REVIEW_NOTE_MIN,
} from '@aporta/shared'

import { paginationFields, sortFields, vine } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * What `GET /administrator/listings` accepts in the query: every ad of the platform, by state. The
 * VineJS pair of the Zod `AdministratorListingPaginateValidator` in `@aporta/shared`. No account
 * parameter, because the staff reads all of them, and the trash is part of the answer (an archived
 * ad is in the trash by definition).
 */
export const AdministratorListingPaginateValidator = vine.create({
  ...paginationFields(),
  status: vine.enum(LISTING_STATUSES).optional(),
  ...sortFields(LISTING_SORT_COLUMNS),
})

/**
 * The staff's decision on an ad in the queue. The VineJS pair of the Zod
 * `AdministratorListingReviewValidator`. The `note` is optional here and required by the entity when
 * the decision is `REFUSE` (`Listing.refuse`).
 */
export const AdministratorListingReviewValidator = vine.create({
  decision: vine.enum(LISTING_REVIEW_DECISIONS),
  note: vine
    .string()
    .trim()
    .minLength(REVIEW_NOTE_MIN)
    .maxLength(REVIEW_NOTE_MAX)
    .optional(),
})

export type AdministratorListingPaginatePayload = Infer<
  typeof AdministratorListingPaginateValidator
>
export type AdministratorListingReviewPayload = Infer<
  typeof AdministratorListingReviewValidator
>
