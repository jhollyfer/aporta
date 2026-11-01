import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@aporta/shared'

import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import SessionTokenRepository, {
  type SessionTokens,
} from '#repositories/session-token/session-token.repository'
import UserRepository from '#repositories/user/user.repository'
import type { AuthenticationSessionSignInPayload } from '#validators/authentication/session.validator'

type Payload = AuthenticationSessionSignInPayload
type Response = Either<HTTPException, SessionTokens>

/**
 * Checks the credentials and issues the token pair of the account that opens the session; the
 * controller only writes the cookies (`_standards/backend.md` §4.1: it does not write through
 * the repository).
 *
 * Wrong password, nonexistent email, archived account and inactive account get the
 * same `401`: the response does not confirm the account ever existed nor why it was
 * refused (`User.canOpenSession`).
 */
@inject()
export default class AuthenticationSessionSignInUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessionTokens: SessionTokenRepository,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const found = await this.users.findByCredentials(
        payload.email,
        payload.password,
      )

      if (found.isLeft()) return left(this.failure(found.value.cause))

      const user = found.value

      if (!user || !user.canOpenSession()) return left(this.invalid())

      const tokens = await this.sessionTokens.issue(user.id)

      if (!tokens) return left(this.notIssued())

      return right(tokens)
    } catch (error) {
      return left(this.failure(error))
    }
  }

  /**
   * Only a wrong credential becomes 401 (the repository returns it as `null`).
   * Any other failure - database down, for example - is a server error.
   * Nothing from the payload goes to the log: the received password would end up in it.
   */
  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[authentication/session > sign-in][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.AUTHENTICATION_SESSION_SIGN_IN_ERROR'),
      'AUTHENTICATION_SESSION_SIGN_IN_ERROR',
    )
  }

  /**
   * The auth package did not hand over the secret of the freshly created token
   * (`SessionTokenRepository.issue` returned `null`): there is no pair to deliver, and the
   * account did nothing wrong.
   */
  private notIssued(): HTTPException {
    logger.error('[authentication/session > sign-in][token not issued]')

    return HTTPException.InternalServerError(
      Translation.t('errors.AUTHENTICATION_SESSION_TOKEN_ISSUE_ERROR'),
      'AUTHENTICATION_SESSION_TOKEN_ISSUE_ERROR',
    )
  }

  private invalid(): HTTPException {
    return HTTPException.Unauthorized(
      Translation.t('errors.INVALID_CREDENTIALS'),
      'INVALID_CREDENTIALS',
      {
        root: Translation.t('fields.INVALID_CREDENTIALS'),
      },
    )
  }
}
