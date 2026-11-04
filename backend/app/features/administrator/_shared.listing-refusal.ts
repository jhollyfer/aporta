import Translation from '#core/translation'
import type {
  ListingAlreadyArchived,
  ListingNotArchived,
  ListingReviewError,
} from '#domain/listing/listing.errors'
import HTTPException from '#exceptions/http.exception'

/** The facts the staff's listing actions refuse: the review's own, archiving what already left and deleting what did not. */
type Fact = ListingAlreadyArchived | ListingNotArchived | ListingReviewError

/**
 * The translation of the listing facts the staff's actions refuse (`_standards/domain.md` §2).
 * Apart from the owner's table (`owner/_shared.listing-refusal.ts`) because a feature does not
 * import another module, and because the two sets of facts do not overlap: the owner never
 * reviews and the staff never edits.
 *
 * `409` when the ad is in a state that refuses the move (not in the queue, already archived),
 * `422` pointing at `note` when the reason was the problem.
 */
export default class AdministratorListingRefusal {
  private static readonly HTTP = {
    LISTING_NOT_PENDING: () =>
      HTTPException.Conflict(
        Translation.t('errors.LISTING_NOT_PENDING'),
        'LISTING_NOT_PENDING',
      ),
    LISTING_REVIEW_NOTE_INVALID: () =>
      HTTPException.UnprocessableEntity(
        Translation.t('errors.LISTING_REVIEW_NOTE_INVALID'),
        'LISTING_REVIEW_NOTE_INVALID',
        { note: Translation.t('fields.LISTING_REVIEW_NOTE_INVALID') },
      ),
    LISTING_ALREADY_ARCHIVED: () =>
      HTTPException.Conflict(
        Translation.t('errors.LISTING_ALREADY_ARCHIVED'),
        'LISTING_ALREADY_ARCHIVED',
      ),
    LISTING_NOT_ARCHIVED: () =>
      HTTPException.Conflict(
        Translation.t('errors.LISTING_NOT_ARCHIVED'),
        'LISTING_NOT_ARCHIVED',
      ),
  } satisfies Record<Fact['code'], () => HTTPException>

  static http(error: Fact): HTTPException {
    return AdministratorListingRefusal.HTTP[error.code]()
  }
}
