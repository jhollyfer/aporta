import { REPORT_REASONS } from '@aporta/shared'

import { vine } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * What a visitor sends to report an ad, with no account. The VineJS pair of the Zod
 * `StorefrontReportCreateValidator` in `@aporta/shared`. `website` is the honeypot: a field the form
 * never shows, empty for a person. The ceiling only keeps it from carrying a payload; the use-case
 * decides what a filled one means.
 */
export const StorefrontReportCreateValidator = vine.create({
  slug: vine.string().trim().minLength(1).maxLength(100),
  reason: vine.enum(REPORT_REASONS),
  details: vine.string().trim().maxLength(500).optional(),
  website: vine.string().trim().maxLength(200).optional(),
})

export type StorefrontReportCreatePayload = Infer<
  typeof StorefrontReportCreateValidator
>
