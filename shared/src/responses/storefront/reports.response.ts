import { z } from '../../validator.js'

/** The receipt of a report: the id only, nothing about the ad or about who looks at it. */
export const StorefrontReportCreateResponse = z.object({ id: z.uuid() })

export type StorefrontReportCreateResponse = z.infer<
  typeof StorefrontReportCreateResponse
>
