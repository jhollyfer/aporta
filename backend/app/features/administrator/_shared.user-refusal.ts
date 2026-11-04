import Translation from '#core/translation'
import type { UserAccessError } from '#domain/user/user.errors'
import HTTPException from '#exceptions/http.exception'

/**
 * The translation of what the account access actions refuse (`_standards/domain.md` §2). All of
 * them are `409`: the request is well formed and the account exists, it is the state of the
 * platform (who is acting, who is left, what the owner still has) that refuses the move.
 *
 * The OpenAPI generator reads this file through the use-cases that import it.
 */
export default class AdministratorUserRefusal {
  private static readonly HTTP = {
    USER_OWN_ACCESS_CHANGE: () =>
      HTTPException.Conflict(
        Translation.t('errors.USER_OWN_ACCESS_CHANGE'),
        'USER_OWN_ACCESS_CHANGE',
      ),
    USER_LAST_ADMINISTRATOR: () =>
      HTTPException.Conflict(
        Translation.t('errors.USER_LAST_ADMINISTRATOR'),
        'USER_LAST_ADMINISTRATOR',
      ),
    USER_OWNS_LISTINGS: () =>
      HTTPException.Conflict(
        Translation.t('errors.USER_OWNS_LISTINGS'),
        'USER_OWNS_LISTINGS',
      ),
  } satisfies Record<UserAccessError['code'], () => HTTPException>

  static http(error: UserAccessError): HTTPException {
    return AdministratorUserRefusal.HTTP[error.code]()
  }

  /** The `404` the id-addressed actions share. */
  static notFound(): HTTPException {
    return HTTPException.NotFound(
      Translation.t('errors.USER_NOT_FOUND'),
      'USER_NOT_FOUND',
    )
  }
}
