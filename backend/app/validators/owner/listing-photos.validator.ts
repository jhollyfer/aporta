import { LISTING_PHOTOS_MAX, PHOTO_ENVIRONMENTS } from '@aporta/shared'

import { vine } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * What the owner sends to put pictures on an ad: files already uploaded through `/storages`, each
 * tied to the environment it shows. The VineJS pair of the Zod `OwnerListingPhotoCreateValidator`
 * in `@aporta/shared`, checked by `validators:check`.
 *
 * That the file exists, is `UPLOADED` and was sent by this account is the use-case's to check
 * through the repository; the uuid only guarantees the shape.
 */
export const OwnerListingPhotoCreateValidator = vine.create({
  photos: vine
    .array(
      vine.object({
        storageId: vine.string().uuid(),
        environment: vine.enum(PHOTO_ENVIRONMENTS),
      }),
    )
    .minLength(1)
    .maxLength(LISTING_PHOTOS_MAX),
})

export type OwnerListingPhotoCreatePayload = Infer<
  typeof OwnerListingPhotoCreateValidator
>
