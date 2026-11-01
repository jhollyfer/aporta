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
