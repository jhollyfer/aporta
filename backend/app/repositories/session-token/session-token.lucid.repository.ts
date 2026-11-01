import { Secret } from '@adonisjs/core/helpers'
import logger from '@adonisjs/core/services/logger'

import { COOKIE_TOKEN } from '#config/session-token'
import User from '#models/user'
import SessionTokenRepository, {
  type SessionToken,
  type SessionTokens,
} from '#repositories/session-token/session-token.repository'

/**
 * The session tokens over the `User` model's `DbAccessTokensProvider`
 * (_doc-lib/adonisjs.md#guides/auth/access-tokens-guard).
 *
 * A repository apart from the guard that writes the cookie: issuing a token touches the database, writing a
 * cookie touches the HTTP response, and those are two different reasons to change. Whoever
 * names and dates the two tokens remains `COOKIE_TOKEN`.
 */
export default class SessionTokenLucidRepository extends SessionTokenRepository {
  async issue(userId: string): Promise<SessionTokens | null> {
    const owner = this.owner(userId)
    const accessToken = await User.accessTokens.create(owner, [], {
      name: COOKIE_TOKEN.ACCESS,
      expiresIn: COOKIE_TOKEN.ACCESS_EXPIRY,
    })
    const refreshToken = await User.accessTokens.create(owner, [], {
      name: COOKIE_TOKEN.REFRESH,
      expiresIn: COOKIE_TOKEN.REFRESH_EXPIRY,
    })

    // `value` is only optional in the type because the same `AccessToken` represents the
    // token read from the database, which does not carry the secret. Freshly created, it always
    // comes; missing it is a package failure, and `null` lets the caller answer 500.
    const access = accessToken.value?.release()
    const refresh = refreshToken.value?.release()

    if (access === undefined || refresh === undefined) return null

    return { accessToken: access, refreshToken: refresh }
  }

  async findAccess(value: string): Promise<SessionToken | null> {
    return this.find(value, COOKIE_TOKEN.ACCESS)
  }

  async findRefresh(value: string): Promise<SessionToken | null> {
    return this.find(value, COOKIE_TOKEN.REFRESH)
  }

  async consume(token: SessionToken): Promise<boolean> {
    const deleted = await User.accessTokens.delete(
      this.owner(token.userId),
      token.identifier,
    )

    return deleted > 0
  }

  async revoke(userId: string, identifier: string): Promise<void> {
    await User.accessTokens.delete(this.owner(userId), identifier)
  }

  /**
   * The token for the cookie value, provided it is the requested `name`: both
   * come out of the same provider, and without checking the name a refresh would pass as an
   * access one. An unreadable token makes `verify` THROW instead of returning null;
   * both cases are the same thing to the caller: an invalid session, not a
   * 500 error.
   */
  private async find(
    value: string,
    name: string,
  ): Promise<SessionToken | null> {
    try {
      const token = await User.accessTokens.verify(new Secret(value))

      if (!token || token.name !== name) return null

      return {
        identifier: String(token.identifier),
        userId: String(token.tokenableId),
      }
    } catch (error) {
      logger.debug({ err: error }, '[session-token][error] unreadable token')
      return null
    }
  }

  /**
   * The token owner as the provider requires it: a `User` instance with the
   * primary key. The provider only reads the key (`$primaryKeyValue`) for
   * `tokenable_id`, so building the instance saves a database round trip that the
   * use-case has already made to decide.
   */
  private owner(userId: string): User {
    const owner = new User()
    owner.id = userId
    return owner
  }
}
