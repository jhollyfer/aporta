import {
  REVIEW_NOTE_MAX,
  REVIEW_NOTE_MIN,
} from '../../enums/listing-review-decision.js'
import { REPORT_STATUSES } from '../../enums/report-status.js'
import { REPORT_SORT_COLUMNS } from '../../records/sort-columns.js'
import { Rule, z } from '../../validator.js'

/** What `GET /administrator/reports` accepts in the query: the queue, by status. */
export const AdministratorReportPaginateValidator = z.object({
  ...Rule.paginationFields(),
  status: Rule.optional(z.enum(REPORT_STATUSES)),
  ...Rule.sortFields(REPORT_SORT_COLUMNS),
})

/** Closes a report with what the staff found (`PUT /administrator/reports/:id/resolution`). */
export const AdministratorReportResolveValidator = z.object({
  note: z.string().trim().min(REVIEW_NOTE_MIN).max(REVIEW_NOTE_MAX),
})

export type AdministratorReportPaginatePayload = z.infer<
  typeof AdministratorReportPaginateValidator
>
export type AdministratorReportResolvePayload = z.infer<
  typeof AdministratorReportResolveValidator
>
