import { REPORT_REASONS } from '../../enums/report-reason.js'
import { Rule, z } from '../../validator.js'

/**
 * What a visitor sends to report an ad (`POST /storefront/reports`), with no account. The ad is
 * named by the `slug` the page URL carries. The `details` are free text, so they have a ceiling
 * and are optional: the reason alone is a valid report.
 *
 * `website` is the honeypot: a field the form never shows, so a person leaves it empty and a bot
 * that fills every input does not. The ceiling is only there so the field cannot carry a payload;
 * what to do with a filled one is the use-case's.
 */
export const StorefrontReportCreateValidator = z.object({
  slug: z.string().trim().min(1).max(100),
  reason: z.enum(REPORT_REASONS),
  details: Rule.optional(z.string().trim().max(500)),
  website: Rule.optional(z.string().trim().max(200)),
})

export type StorefrontReportCreatePayload = z.infer<
  typeof StorefrontReportCreateValidator
>
