/**
 * The kind of property a listing offers. A lookup object and not a loose union: the key names
 * the value in the code, the value is what goes to the API, and the type is derived
 * (`_standards/typescript.md` §4). The label the user sees lives in the frontend's
 * `lib/labels.ts`, because it is presentation.
 */
export const LISTING_TYPE = {
  HOUSE: 'HOUSE',
  APARTMENT: 'APARTMENT',
  KITNET: 'KITNET',
  ROOM: 'ROOM',
  HOTEL: 'HOTEL',
} as const

export type ListingType = (typeof LISTING_TYPE)[keyof typeof LISTING_TYPE]

export const LISTING_TYPES = Object.values(LISTING_TYPE)
