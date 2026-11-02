import {
  REPORT_SORT_COLUMNS,
  REPORT_STATUSES,
  REVIEW_NOTE_MAX,
  REVIEW_NOTE_MIN,
} from '@aporta/shared'

import { paginationFields, sortFields, vine } from '#core/validator'
import type { Infer } from '#core/validator'

/** The staff's report queue, by status. The VineJS pair of the Zod `AdministratorReportPaginateValidator`. */
export const AdministratorReportPaginateValidator = vine.create({
  ...paginationFields(),
  status: vine.enum(REPORT_STATUSES).optional(),
  ...sortFields(REPORT_SORT_COLUMNS),
})

/** Closes a report with a note. The VineJS pair of the Zod `AdministratorReportResolveValidator`. */
export const AdministratorReportResolveValidator = vine.create({
  note: vine
    .string()
    .trim()
    .minLength(REVIEW_NOTE_MIN)
    .maxLength(REVIEW_NOTE_MAX),
})

export type AdministratorReportPaginatePayload = Infer<
  typeof AdministratorReportPaginateValidator
>
export type AdministratorReportResolvePayload = Infer<
  typeof AdministratorReportResolveValidator
>
