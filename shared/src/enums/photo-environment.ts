import { STORAGE_MIMETYPE } from './storage-mimetype.js'

/**
 * The room a listing photo shows. Asking for each one by name is how the owner is guided to
 * the complete ad: a listing that only shows the bed or a corner of the room is a warning sign.
 */
export const PHOTO_ENVIRONMENT = {
  FACADE: 'FACADE',
  BEDROOM: 'BEDROOM',
  BATHROOM: 'BATHROOM',
  KITCHEN: 'KITCHEN',
  LIVING: 'LIVING',
} as const

export type PhotoEnvironment =
  (typeof PHOTO_ENVIRONMENT)[keyof typeof PHOTO_ENVIRONMENT]

export const PHOTO_ENVIRONMENTS = Object.values(PHOTO_ENVIRONMENT)

/**
 * How many pictures one listing may carry. Five environments are asked for by name, and the rest
 * is room for a second view of the bedroom or the street: a ceiling keeps one ad from taking the
 * bucket, and the entity and the validator read this same number.
 */
export const LISTING_PHOTOS_MAX = 12

/**
 * The file types a listing photo accepts: the three formats every phone and browser produce.
 * Narrower than `IMAGE_MIMETYPES` on purpose (an animated GIF is not a photo of a room), and
 * the backend and the picker read this same list.
 */
export const LISTING_PHOTO_MIMETYPES = [
  STORAGE_MIMETYPE.JPEG,
  STORAGE_MIMETYPE.PNG,
  STORAGE_MIMETYPE.WEBP,
] as const

/**
 * The ceiling of one listing photo, in bytes: 10 MB (the owner's decision). It is a product rule,
 * not a deploy knob, so it lives here and not in the ENV: `UPLOAD_MAX_SIZE` stays the generic
 * ceiling of `POST /storages`, and this is the stricter one checked when the file is attached.
 */
export const LISTING_PHOTO_MAX_SIZE = 10 * 1024 * 1024
