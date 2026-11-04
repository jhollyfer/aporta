/**
 * The listing domain facts: what the entity refuses, with no HTTP status or screen text
 * (`_standards/domain.md` §2). Slug uniqueness is a question for the repository.
 */

/** A listing with no title to show. */
export type ListingTitleEmpty = { readonly code: 'LISTING_TITLE_EMPTY' }

/** Neither the monthly nor the daily price: the visitor could not tell what it costs. */
export type ListingPriceRequired = { readonly code: 'LISTING_PRICE_REQUIRED' }

/** A price that is zero, negative or has cents: whole reais above zero. */
export type ListingPriceInvalid = { readonly code: 'LISTING_PRICE_INVALID' }

/** A listing that is not for rent for any period. */
export type ListingPeriodsEmpty = { readonly code: 'LISTING_PERIODS_EMPTY' }

/** More pictures than one ad may carry (`LISTING_PHOTOS_MAX`). */
export type ListingPhotosLimit = { readonly code: 'LISTING_PHOTOS_LIMIT' }

/** The same file twice in one gallery: two slots would show one picture. */
export type ListingPhotoDuplicated = {
  readonly code: 'LISTING_PHOTO_DUPLICATED'
}

/** A photo id the gallery does not have: removed already, or from another ad. */
export type ListingPhotoNotFound = { readonly code: 'LISTING_PHOTO_NOT_FOUND' }

/**
 * A new order that is not exactly the gallery: an id missing, an extra one, a repeated one or one
 * from another ad. Reordering only moves the photos the ad has; it neither adds nor drops any.
 */
export type ListingPhotosOrderInvalid = {
  readonly code: 'LISTING_PHOTOS_ORDER_INVALID'
}

/** A listing photo that is not a JPEG, PNG or WebP (`LISTING_PHOTO_MIMETYPES`). */
export type ListingPhotoTypeInvalid = {
  readonly code: 'LISTING_PHOTO_TYPE_INVALID'
}

/** A listing photo above the ceiling of one photo (`LISTING_PHOTO_MAX_SIZE`). */
export type ListingPhotoTooLarge = { readonly code: 'LISTING_PHOTO_TOO_LARGE' }

/** An ad that already left the air cannot leave it again. */
export type ListingAlreadyArchived = {
  readonly code: 'LISTING_ALREADY_ARCHIVED'
}

/** Deleting for good an ad that is still on the air or in the queue: it has to be archived first. */
export type ListingNotArchived = { readonly code: 'LISTING_NOT_ARCHIVED' }

/** Approving or refusing an ad that is not waiting in the queue: it was already decided, or never sent. */
export type ListingNotPending = { readonly code: 'LISTING_NOT_PENDING' }

/** A refusal without a reason the owner can act on (`REVIEW_NOTE_MIN` to `REVIEW_NOTE_MAX` characters). */
export type ListingReviewNoteInvalid = {
  readonly code: 'LISTING_REVIEW_NOTE_INVALID'
}

export type ListingError =
  | ListingTitleEmpty
  | ListingPriceRequired
  | ListingPriceInvalid
  | ListingPeriodsEmpty
  | ListingPhotosLimit
  | ListingPhotoDuplicated
  | ListingPhotoTypeInvalid
  | ListingPhotoTooLarge
  | ListingPhotoNotFound
  | ListingPhotosOrderInvalid
  | ListingAlreadyArchived

/**
 * What the staff's decision refuses. Apart from `ListingError` on purpose: those are the facts
 * the owner's actions can run into, and the owner's translation table must not have to answer for
 * a review he can never trigger.
 */
export type ListingReviewError = ListingNotPending | ListingReviewNoteInvalid
