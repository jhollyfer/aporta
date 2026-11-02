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

export type ListingError =
  | ListingTitleEmpty
  | ListingPriceRequired
  | ListingPriceInvalid
  | ListingPeriodsEmpty
