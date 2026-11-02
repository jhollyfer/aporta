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
