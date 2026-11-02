/**
 * What the staff decides about an ad waiting in the queue. `APPROVE` puts it on the air;
 * `REFUSE` sends it back to the owner with the reason (the ad returns to `DRAFT`, and editing it
 * hands it to the queue again).
 */
export const LISTING_REVIEW_DECISION = {
  APPROVE: 'APPROVE',
  REFUSE: 'REFUSE',
} as const

export type ListingReviewDecision =
  (typeof LISTING_REVIEW_DECISION)[keyof typeof LISTING_REVIEW_DECISION]

export const LISTING_REVIEW_DECISIONS = Object.values(LISTING_REVIEW_DECISION)

/** The reason a refusal carries: short enough to read on a phone, long enough to be useful. */
export const REVIEW_NOTE_MIN = 3
export const REVIEW_NOTE_MAX = 500
