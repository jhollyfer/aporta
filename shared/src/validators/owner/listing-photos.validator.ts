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
