import { OwnerListingShowResponse } from './listings.response.js'
import type { z } from '../../validator.js'

/**
 * `POST /owner/listings/:id/photos` answers with the whole ad as it ended up, photos in order and
 * signed: the screen redraws the gallery from one body, instead of merging the new slots into
 * what it had.
 */
export const OwnerListingPhotoCreateResponse = OwnerListingShowResponse

export type OwnerListingPhotoCreateResponse = z.infer<
  typeof OwnerListingPhotoCreateResponse
>
