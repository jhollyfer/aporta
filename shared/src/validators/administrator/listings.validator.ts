import {
  LISTING_REVIEW_DECISIONS,
  REVIEW_NOTE_MAX,
  REVIEW_NOTE_MIN,
} from '../../enums/listing-review-decision.js'
import { LISTING_STATUSES } from '../../enums/listing-status.js'
import { LISTING_SORT_COLUMNS } from '../../records/sort-columns.js'
import { Rule, z } from '../../validator.js'

/**
 * What `GET /administrator/listings` accepts in the query: every ad of the platform, by state.
 * Unlike the owner's list there is no account cut (the staff reads all), and the trash is part of
 * the answer on purpose: an archived ad is in the trash by definition, so `?status=ARCHIVED`
 * would be empty otherwise.
 */
export const AdministratorListingPaginateValidator = z.object({
  ...Rule.paginationFields(),
  status: Rule.optional(z.enum(LISTING_STATUSES)),
  ...Rule.sortFields(LISTING_SORT_COLUMNS),
})

/**
 * The staff's decision on an ad in the queue (`PUT /administrator/listings/:id/review`). The
 * `note` is optional here and required by the use-case when the decision is `REFUSE`: a rule that
 * depends on another field is not something both validator libraries express the same way, and
 * `validators:check` compares what they do express.
 */
export const AdministratorListingReviewValidator = z.object({
  decision: z.enum(LISTING_REVIEW_DECISIONS),
  note: Rule.optional(
    z.string().trim().min(REVIEW_NOTE_MIN).max(REVIEW_NOTE_MAX),
  ),
})

export type AdministratorListingPaginatePayload = z.infer<
  typeof AdministratorListingPaginateValidator
>
export type AdministratorListingReviewPayload = z.infer<
  typeof AdministratorListingReviewValidator
>
