import Translation from '#core/translation'
import type { NeighborhoodNotFound } from '#domain/neighborhood/neighborhood.errors'
import type {
  PlaceAlreadyArchived,
  PlaceError,
  PlaceNotArchived,
} from '#domain/place/place.errors'
import HTTPException from '#exceptions/http.exception'

/**
 * The facts the staff's guide actions refuse: the entity's own (`PlaceError`), the state moves
 * (archiving what is archived, restoring or erasing what is not) and the neighborhood lookup the
 * write makes before it saves.
 */
type Fact =
  PlaceError | PlaceAlreadyArchived | PlaceNotArchived | NeighborhoodNotFound

/**
 * The translation of the guide facts the staff's actions refuse (`_standards/domain.md` §2).
 * `422` pointing at the payload field when the payload was the cause, `409` when the place is in
 * a state that refuses the move. The `field` of the not-found neighborhood is fixed here, the way
 * the owner's ad form does: the payload names it once, `neighborhood`.
 *
 * The OpenAPI generator reads this file through the use-cases that import it.
 */
export default class AdministratorPlaceRefusal {
  private static readonly HTTP = {
    PLACE_NAME_EMPTY: () =>
      HTTPException.UnprocessableEntity(
        Translation.t('errors.PLACE_NAME_EMPTY'),
        'PLACE_NAME_EMPTY',
        { name: Translation.t('fields.PLACE_NAME_EMPTY') },
      ),
    PLACE_EVENT_DATE_REQUIRED: () =>
      HTTPException.UnprocessableEntity(
        Translation.t('errors.PLACE_EVENT_DATE_REQUIRED'),
        'PLACE_EVENT_DATE_REQUIRED',
        { date: Translation.t('fields.PLACE_EVENT_DATE_REQUIRED') },
      ),
    PLACE_DATE_NOT_ALLOWED: () =>
      HTTPException.UnprocessableEntity(
        Translation.t('errors.PLACE_DATE_NOT_ALLOWED'),
        'PLACE_DATE_NOT_ALLOWED',
        { date: Translation.t('fields.PLACE_DATE_NOT_ALLOWED') },
      ),
    PLACE_DATE_INVALID: () =>
      HTTPException.UnprocessableEntity(
        Translation.t('errors.PLACE_DATE_INVALID'),
        'PLACE_DATE_INVALID',
        { date: Translation.t('fields.PLACE_DATE_INVALID') },
      ),
    PLACE_ALREADY_ARCHIVED: () =>
      HTTPException.Conflict(
        Translation.t('errors.PLACE_ALREADY_ARCHIVED'),
        'PLACE_ALREADY_ARCHIVED',
      ),
    PLACE_NOT_ARCHIVED: () =>
      HTTPException.Conflict(
        Translation.t('errors.PLACE_NOT_ARCHIVED'),
        'PLACE_NOT_ARCHIVED',
      ),
    NEIGHBORHOOD_NOT_FOUND: () =>
      HTTPException.UnprocessableEntity(
        Translation.t('errors.NEIGHBORHOOD_NOT_FOUND'),
        'NEIGHBORHOOD_NOT_FOUND',
        { neighborhood: Translation.t('fields.NEIGHBORHOOD_NOT_FOUND') },
      ),
  } satisfies Record<Fact['code'], () => HTTPException>

  static http(error: Fact): HTTPException {
    return AdministratorPlaceRefusal.HTTP[error.code]()
  }

  /** The `404` the id-addressed actions share. */
  static notFound(): HTTPException {
    return HTTPException.NotFound(
      Translation.t('errors.PLACE_NOT_FOUND'),
      'PLACE_NOT_FOUND',
    )
  }
}
