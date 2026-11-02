import { LISTING_STATUSES } from '../../enums/listing-status.js'
import { PHOTO_ENVIRONMENTS } from '../../enums/photo-environment.js'
import { z } from '../../validator.js'
import { ResponseRule } from '../envelope.js'
import { StorefrontListingShowResponse } from '../storefront/listings.response.js'

/**
 * The ad as its owner reads it: the public shape plus what only the owner needs, the `status`
 * (so he sees an ad waiting for review) and the `storageId` of each photo (so he can tell which
 * file a slot holds). Never the `ownerId` nor `deletedAt`: the first is the session's, and an ad
 * in the trash is not read.
 *
 * Built from the storefront response and not copied from it, so a field added to the public ad
 * reaches the owner's screen too and the two cannot drift apart.
 */
export const OwnerListingShowResponse = StorefrontListingShowResponse.omit({
  photos: true,
}).extend({
  status: z.enum(LISTING_STATUSES),
  photos: z.array(
    z.object({
      id: z.uuid(),
      environment: z.enum(PHOTO_ENVIRONMENTS),
      storageId: z.uuid().nullable(),
      url: z.string().nullable(),
    }),
  ),
})

export type OwnerListingShowResponse = z.infer<typeof OwnerListingShowResponse>

export const OwnerListingPaginateResponse = ResponseRule.paginated(
  OwnerListingShowResponse,
)

export type OwnerListingPaginateResponse = z.infer<
  typeof OwnerListingPaginateResponse
>
