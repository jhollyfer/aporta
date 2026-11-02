import Translation from '#core/translation'
import type { ListingError } from '#domain/listing/listing.errors'
import type { NeighborhoodNotFound } from '#domain/neighborhood/neighborhood.errors'
import type { StorageNotFound } from '#domain/storage/storage.errors'
import HTTPException from '#exceptions/http.exception'

/**
 * The facts the owner's listing actions refuse, from the entity (`ListingError`) and from the
 * lookups the use-cases make before the write (the neighborhood by `slug`, the files by id).
 */
type Fact = ListingError | NeighborhoodNotFound | StorageNotFound

/**
 * The translation of the listing facts that more than one owner action refuses in the same way
 * (`_standards/domain.md` §2): create, update and the photos share them, and a copy per action is
 * where the same refusal comes out with two codes.
 *
 * `422` pointing at the payload field when the payload was the cause (a neighborhood or a file
 * that does not exist, a price the ad cannot be without), `409` when the ad is in a state that
 * refuses the move (already archived). The `field` of the not-found facts is fixed here, not read
 * from the fact: the payload names it once, `neighborhood` and `photos`.
 *
 * The OpenAPI generator reads this file through the use-cases that import it.
 */
export default class ListingRefusal {
  private static readonly HTTP = {
    LISTING_TITLE_EMPTY: () =>
      HTTPException.UnprocessableEntity(
        Translation.t('errors.LISTING_TITLE_EMPTY'),
        'LISTING_TITLE_EMPTY',
        { title: Translation.t('fields.LISTING_TITLE_EMPTY') },
      ),
    LISTING_PRICE_REQUIRED: () =>
      HTTPException.UnprocessableEntity(
        Translation.t('errors.LISTING_PRICE_REQUIRED'),
        'LISTING_PRICE_REQUIRED',
        { monthly: Translation.t('fields.LISTING_PRICE_REQUIRED') },
      ),
    LISTING_PRICE_INVALID: () =>
      HTTPException.UnprocessableEntity(
        Translation.t('errors.LISTING_PRICE_INVALID'),
        'LISTING_PRICE_INVALID',
        { monthly: Translation.t('fields.LISTING_PRICE_INVALID') },
      ),
    LISTING_PERIODS_EMPTY: () =>
      HTTPException.UnprocessableEntity(
        Translation.t('errors.LISTING_PERIODS_EMPTY'),
        'LISTING_PERIODS_EMPTY',
        { periods: Translation.t('fields.LISTING_PERIODS_EMPTY') },
      ),
    LISTING_PHOTOS_LIMIT: () =>
      HTTPException.UnprocessableEntity(
        Translation.t('errors.LISTING_PHOTOS_LIMIT'),
        'LISTING_PHOTOS_LIMIT',
        { photos: Translation.t('fields.LISTING_PHOTOS_LIMIT') },
      ),
    LISTING_PHOTO_DUPLICATED: () =>
      HTTPException.Conflict(
        Translation.t('errors.LISTING_PHOTO_DUPLICATED'),
        'LISTING_PHOTO_DUPLICATED',
        { photos: Translation.t('fields.LISTING_PHOTO_DUPLICATED') },
      ),
    LISTING_ALREADY_ARCHIVED: () =>
      HTTPException.Conflict(
        Translation.t('errors.LISTING_ALREADY_ARCHIVED'),
        'LISTING_ALREADY_ARCHIVED',
      ),
    NEIGHBORHOOD_NOT_FOUND: () =>
      HTTPException.UnprocessableEntity(
        Translation.t('errors.NEIGHBORHOOD_NOT_FOUND'),
        'NEIGHBORHOOD_NOT_FOUND',
        { neighborhood: Translation.t('fields.NEIGHBORHOOD_NOT_FOUND') },
      ),
    STORAGE_NOT_FOUND: () =>
      HTTPException.UnprocessableEntity(
        Translation.t('errors.STORAGE_NOT_FOUND'),
        'STORAGE_NOT_FOUND',
        { photos: Translation.t('fields.STORAGE_NOT_FOUND') },
      ),
  } satisfies Record<Fact['code'], () => HTTPException>

  static http(error: Fact): HTTPException {
    return ListingRefusal.HTTP[error.code]()
  }
}
