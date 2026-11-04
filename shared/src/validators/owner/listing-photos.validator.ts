import {
  LISTING_PHOTOS_MAX,
  PHOTO_ENVIRONMENTS,
} from '../../enums/photo-environment.js'
import { z } from '../../validator.js'

/**
 * What the owner sends to put pictures on an ad (`POST /owner/listings/:id/photos`): files that
 * were already uploaded through `/storages`, each one tied to the environment it shows. The
 * binary never travels here, only the key of the `storages` row.
 *
 * That the file exists, is `UPLOADED` and is the owner's own is the use-case's to check; the uuid
 * only guarantees the shape. The ceiling is the ad's, and the entity checks it again against what
 * the ad already carries.
 */
export const OwnerListingPhotoCreateValidator = z.object({
  photos: z
    .array(
      z.object({
        storageId: z.uuid(),
        environment: z.enum(PHOTO_ENVIRONMENTS),
      }),
    )
    .min(1)
    .max(LISTING_PHOTOS_MAX),
})

export type OwnerListingPhotoCreatePayload = z.infer<
  typeof OwnerListingPhotoCreateValidator
>

/**
 * The two identifiers of `DELETE /owner/listings/:id/photos/:photoId`, read from the URL: a
 * malformed one is a `422` pointing at the field, not a Postgres `500`. That the photo is in this
 * ad is the entity's (`Listing.removePhoto`).
 */
export const OwnerListingPhotoDeleteValidator = z.object({
  id: z.uuid(),
  photoId: z.uuid(),
})

export type OwnerListingPhotoDeletePayload = z.infer<
  typeof OwnerListingPhotoDeleteValidator
>

/**
 * The new order of the gallery (`PUT /owner/listings/:id/photos/order`): the ids of the photos the
 * ad has, first to last. That it is exactly the gallery (none missing, none extra, none twice) is
 * the entity's (`Listing.reorderPhotos`, `LISTING_PHOTOS_ORDER_INVALID`); the validator only
 * guarantees the shape and the ceiling.
 */
export const OwnerListingPhotoReorderValidator = z.object({
  photoIds: z.array(z.uuid()).min(1).max(LISTING_PHOTOS_MAX),
})

export type OwnerListingPhotoReorderPayload = z.infer<
  typeof OwnerListingPhotoReorderValidator
>
