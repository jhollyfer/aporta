/**
 * Where a listing is in its life. Only `PUBLISHED` reaches the public storefront: a draft is
 * still being written by the owner, `PENDING` waits for the review (`docs/PRD.md`) and
 * `ARCHIVED` is an ad that left the air. The public reads treat the three others as
 * nonexistent, never as "unavailable".
 */
export const LISTING_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const

export type ListingStatus = (typeof LISTING_STATUS)[keyof typeof LISTING_STATUS]

export const LISTING_STATUSES = Object.values(LISTING_STATUS)
