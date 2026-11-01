import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@aporta/shared'

import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import SessionTokenRepository, {
  type SessionTokens,
} from '#repositories/session-token/session-token.repository'
import UserRepository from '#repositories/user/user.repository'

type Payload = {
  readonly refreshToken?: string
}
type Response = Either<HTTPException, SessionTokens>

/**
 * Spends the cookie's refresh and issues the new pair for the account; the controller only
 * writes the cookies (`_standards/backend.md` §4.1). A missing cookie answers
 * `REFRESH_TOKEN_MISSING`; unreadable, of another type, spent or of an account that
 * can no longer have a session, `REFRESH_TOKEN_INVALID`.
 */
@inject()
export default class AuthenticationSessionRefreshUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessionTokens: SessionTokenRepository,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    if (!payload.refreshToken) {
      return left(
        HTTPException.Unauthorized(
          Translation.t('errors.REFRESH_TOKEN_MISSING'),
          'REFRESH_TOKEN_MISSING',
        ),
      )
    }

    const refreshToken = await this.sessionTokens.findRefresh(
      payload.refreshToken,
    )

    if (!refreshToken) return left(this.invalid())

    try {
      // The same cut as the guard: renewing without it would extend in writing a
      // session that has already ended.
      const user = await this.users.findById(refreshToken.userId)

      if (!user || !user.canOpenSession()) return left(this.invalid())

      // The `DELETE` is the critical section, and that is why it comes before issuing: only whoever
      // deleted the row gets the right to the new pair. Two simultaneous
      // renewals do not issue two pairs from the same token.
      const consumed = await this.sessionTokens.consume(refreshToken)

      if (!consumed) return left(this.invalid())

      const tokens = await this.sessionTokens.issue(user.id)

      if (!tokens) {
        logger.error('[authentication/session > refresh][token not issued]')

        return left(
          HTTPException.InternalServerError(
            Translation.t('errors.AUTHENTICATION_SESSION_TOKEN_ISSUE_ERROR'),
            'AUTHENTICATION_SESSION_TOKEN_ISSUE_ERROR',
          ),
        )
      }

      return right(tokens)
    } catch (error) {
      logger.error({ err: error }, '[authentication/session > refresh][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.AUTHENTICATION_SESSION_REFRESH_ERROR'),
          'AUTHENTICATION_SESSION_REFRESH_ERROR',
        ),
      )
    }
  }

  private invalid(): HTTPException {
    return HTTPException.Unauthorized(
      Translation.t('errors.REFRESH_TOKEN_INVALID'),
      'REFRESH_TOKEN_INVALID',
    )
  }
}
