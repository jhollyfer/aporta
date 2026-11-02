import { REPORT_REASONS } from '../../enums/report-reason.js'
import { REPORT_STATUSES } from '../../enums/report-status.js'
import { z } from '../../validator.js'
import { ResponseRule } from '../envelope.js'

/**
 * A scam report as the staff reads it. `reporter` is a short piece of the keyed hash of the
 * reporter's address, enough to see that three reports came from the same place and not enough
 * to find the person; it is `null` when the address was not available.
 */
export const AdministratorReportShowResponse = z.object({
  id: z.uuid(),
  listing: z.object({
    id: z.uuid(),
    slug: z.string(),
    title: z.string(),
  }),
  reason: z.enum(REPORT_REASONS),
  details: z.string().nullable(),
  status: z.enum(REPORT_STATUSES),
  reporter: z.string().nullable(),
  createdAt: ResponseRule.datetime(),
  resolvedAt: ResponseRule.datetime().nullable(),
  resolvedBy: z.uuid().nullable(),
  resolutionNote: z.string().nullable(),
})

export type AdministratorReportShowResponse = z.infer<
  typeof AdministratorReportShowResponse
>

export const AdministratorReportPaginateResponse = ResponseRule.paginated(
  AdministratorReportShowResponse,
)

export type AdministratorReportPaginateResponse = z.infer<
  typeof AdministratorReportPaginateResponse
>
