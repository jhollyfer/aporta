import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Actor, type Either } from '@aporta/shared'

import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import SessionTokenRepository from '#repositories/session-token/session-token.repository'

type Payload = {
  /** The session account (`_standards/backend.md` §4.3). */
  readonly actor: Actor
  /** The access token that authenticated this request. */
  readonly accessTokenId?: string
  readonly refreshToken?: string
}
type Response = Either<HTTPException, null>

/**
 * Ends the session: deletes this request's access token and the cookie's refresh,
 * if it is a refresh one and of the same account. An unreadable refresh does not prevent
 * the sign-out: the cookies are cleared anyway by the controller.
 */
@inject()
export default class AuthenticationSessionSignOutUseCase {
  constructor(private readonly sessionTokens: SessionTokenRepository) {}

  async execute({
    actor,
    accessTokenId,
    refreshToken,
  }: Payload): Promise<Response> {
    try {
      if (accessTokenId)
        await this.sessionTokens.revoke(actor.id, accessTokenId)

      if (refreshToken) {
        const token = await this.sessionTokens.findRefresh(refreshToken)

        if (token) await this.sessionTokens.revoke(actor.id, token.identifier)
      }

      return right(null)
    } catch (error) {
      logger.error({ err: error }, '[authentication/session > sign-out][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.AUTHENTICATION_SESSION_SIGN_OUT_ERROR'),
          'AUTHENTICATION_SESSION_SIGN_OUT_ERROR',
        ),
      )
    }
  }
}
