import { errors, symbols } from '@adonisjs/auth'
import type {
  AuthClientResponse,
  GuardConfigProvider,
  GuardContract,
} from '@adonisjs/auth/types'
import type { HttpContext } from '@adonisjs/core/http'
import type { UserRole } from '@aporta/shared'

import { COOKIE_TOKEN, SESSION_COOKIE } from '#config/session-token'
import SessionTokenRepository, {
  type SessionTokens,
} from '#repositories/session-token/session-token.repository'
import UserRepository from '#repositories/user/user.repository'

/** The access token that authenticated the request, as logout deletes it. */
type CurrentAccessToken = { readonly identifier: string }

/**
 * Who authenticated the request: only what the rules read (`id`, `email`,
 * `role`, `avatarId`) and the token that authenticated it, never the account row.
 * It is not the `User` model: a guard does not import a model (`architecture.md` §2), and the
 * account comes from `UserRepository`.
 */
export type SessionUser = {
  readonly id: string
  readonly email: string
  readonly role: UserRole
  readonly avatarId: string | null
  readonly currentAccessToken: CurrentAccessToken
}

/**
 * Reuses Adonis's native opaque access token machinery - hash,
 * expiration and persistence by `DbAccessTokensProvider` - and swaps only the
 * transport: the token is read from the `COOKIE_TOKEN.ACCESS` cookie.
 *
 * **No fallback to the `Authorization` header.** The cookie is `httpOnly`
 * precisely so the page JavaScript cannot reach the token; accepting
 * the same token via the header would reopen the path that `httpOnly` closes.
 */
export class CookieAccessTokensGuard implements GuardContract<SessionUser> {
  readonly driverName = COOKIE_TOKEN.DRIVER_NAME
  authenticationAttempted = false
  isAuthenticated = false
  user?: SessionUser;

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- the contract types the guard's events as `{}`; this guard emits none
  declare [symbols.GUARD_KNOWN_EVENTS]: {}

  constructor(
    private readonly context: HttpContext,
    private readonly tokens: SessionTokenRepository,
    private readonly users: UserRepository,
  ) {}

  #authenticationFailed(): Error {
    return new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
      guardDriverName: this.driverName,
    })
  }

  /**
   * The text of a request cookie, or `undefined` when it is absent or empty.
   *
   * `request.cookie()` is typed `any`: the value enters as `unknown` and is narrowed here, in the
   * one place, so no caller assigns an `any`.
   */
  #read(name: string): string | undefined {
    const value: unknown = this.context.request.cookie(name)

    if (typeof value !== 'string' || value === '') return undefined

    return value
  }

  #getCookieToken(): string {
    const token = this.#read(COOKIE_TOKEN.ACCESS)

    if (!token) throw this.#authenticationFailed()

    return token
  }

  /** The refresh cookie of the request, which sign-out and refresh hand to their use-case. */
  refreshToken(): string | undefined {
    return this.#read(COOKIE_TOKEN.REFRESH)
  }

  /** Writes the pair as `httpOnly` cookies, each with its lifetime. */
  issueCookies(tokens: SessionTokens): void {
    this.context.response
      .cookie(COOKIE_TOKEN.ACCESS, tokens.accessToken, {
        ...SESSION_COOKIE,
        maxAge: COOKIE_TOKEN.ACCESS_EXPIRY,
      })
      .cookie(COOKIE_TOKEN.REFRESH, tokens.refreshToken, {
        ...SESSION_COOKIE,
        maxAge: COOKIE_TOKEN.REFRESH_EXPIRY,
      })
  }

  /**
   * Expires both cookies with the SAME attributes as issuance, and not a bare `clearCookie`:
   * without them the browser creates a second empty host-only cookie and the domain one
   * survives - the logout "works" in the response and the session stays up on the next F5.
   */
  clearCookies(): void {
    this.context.response
      .clearCookie(COOKIE_TOKEN.ACCESS, SESSION_COOKIE)
      .clearCookie(COOKIE_TOKEN.REFRESH, SESSION_COOKIE)
  }

  getUserOrFail(): SessionUser {
    if (!this.user) throw this.#authenticationFailed()

    return this.user
  }

  async authenticate(): Promise<SessionUser> {
    if (this.authenticationAttempted) return this.getUserOrFail()

    this.authenticationAttempted = true

    // The repository only returns an access token: the refresh one comes out of the same
    // provider and would pass the same verification, which would give a session with the
    // refresh validity.
    const token = await this.tokens.findAccess(this.#getCookieToken())

    if (!token) throw this.#authenticationFailed()

    // The account is read on every request, and not only at sign-in: the token lives a day,
    // and archiving or deactivating someone must expel them on the next request, not just
    // stop them from signing in again.
    const account = await this.users.findById(token.userId)

    if (!account?.canOpenSession()) throw this.#authenticationFailed()

    const { id, email, role, avatarId } = account.snapshot()

    this.user = {
      id,
      email,
      role,
      avatarId,
      currentAccessToken: { identifier: token.identifier },
    }
    this.isAuthenticated = true
    return this.user
  }

  async check(): Promise<boolean> {
    try {
      await this.authenticate()
      return true
    } catch {
      return false
    }
  }

  /**
   * How Japa's api client authenticates a user in tests. Without this,
   * `client.get(...).loginAs(user)` would have no way to build the session, and each
   * spec would have to sign in over HTTP before every request.
   */
  async authenticateAsClient(user: SessionUser): Promise<AuthClientResponse> {
    const tokens = await this.tokens.issue(user.id)

    // Without the pair, the test goes out without a session and the `401` that follows reports it.
    if (!tokens) return { cookies: {} }

    return {
      cookies: {
        [COOKIE_TOKEN.ACCESS]: tokens.accessToken,
        [COOKIE_TOKEN.REFRESH]: tokens.refreshToken,
      },
    }
  }

  /**
   * The guard as `config/auth.ts` registers it: a `GuardConfigProvider`, whose
   * `resolver` receives the application once, on first use, and returns the factory
   * that creates a guard per request with its context
   * (_doc-lib/adonisjs.md#guides/auth/custom-auth-guard). Dependencies are
   * resolved here and come in through the constructor: the guard asks nothing of the container.
   */
  static provider(): GuardConfigProvider<
    (context: HttpContext) => CookieAccessTokensGuard
  > {
    return {
      async resolver(_name, app) {
        const tokens = await app.container.make(SessionTokenRepository)
        const users = await app.container.make(UserRepository)

        return (context) => new CookieAccessTokensGuard(context, tokens, users)
      },
    }
  }
}
