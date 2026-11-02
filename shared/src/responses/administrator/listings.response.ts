import { z } from '../../validator.js'
import { ResponseRule } from '../envelope.js'
import { OwnerListingShowResponse } from '../owner/listings.response.js'

/**
 * The ad as the staff reads it: the owner's shape (so the queue shows what the owner sees) plus
 * what only the review needs. `account` is the person behind the ad, with the e-mail the staff
 * may need to reach them (`null` for the ads seeded before accounts existed); `archivedAt` is when
 * it left the air, because the staff list includes the trash; `review` also says who decided.
 */
export const AdministratorListingShowResponse = OwnerListingShowResponse.extend(
  {
    publishedAt: ResponseRule.datetime().nullable(),
    archivedAt: ResponseRule.datetime().nullable(),
    account: z
      .object({
        id: z.uuid(),
        name: z.string(),
        email: z.string(),
        verified: z.boolean(),
      })
      .nullable(),
    review: z
      .object({
        note: z.string().nullable(),
        reviewedAt: ResponseRule.datetime(),
        reviewedBy: z.uuid().nullable(),
      })
      .nullable(),
  },
)

export type AdministratorListingShowResponse = z.infer<
  typeof AdministratorListingShowResponse
>

export const AdministratorListingPaginateResponse = ResponseRule.paginated(
  AdministratorListingShowResponse,
)

export type AdministratorListingPaginateResponse = z.infer<
  typeof AdministratorListingPaginateResponse
>
