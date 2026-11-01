/** The plain-text token pair, which only exists at the moment of issuance. */
export type SessionTokens = {
  readonly accessToken: string
  readonly refreshToken: string
}

/** The token the cookie brought, already checked: whose it is and which one it is. */
export type SessionToken = {
  readonly identifier: string
  readonly userId: string
}

/**
 * The session tokens (`auth_access_tokens`, via Adonis's `DbAccessTokensProvider`):
 * issue the pair, check the refresh, spend it and revoke a token.
 *
 * A contract (`_standards/solid.md` §2) because it is I/O that the unit tests need to
 * pin down: the session use-cases ask for this contract, and
 * `providers/repository.provider.ts` binds it to `SessionTokenLucidRepository`. Whoever writes the
 * cookie is the `cookie-access-tokens` guard (`app/guards/`).
 */
export default abstract class SessionTokenRepository {
  /**
   * Issues the pair for the account; the plain-text value only leaves from here. `null` when the
   * auth package did not hand over the secret of the freshly created token.
   */
  abstract issue(userId: string): Promise<SessionTokens | null>

  /**
   * The access token the cookie value represents, or `null` when it is
   * unreadable, does not exist, expired or is not an access one: the guard refuses the four
   * in the same way. A refresh presented here is `null`, otherwise it would give a session
   * with its validity.
   */
  abstract findAccess(value: string): Promise<SessionToken | null>

  /**
   * The refresh the cookie value represents, or `null` when it is
   * unreadable, does not exist or is not a refresh one: the three are the same invalid
   * session to the caller.
   */
  abstract findRefresh(value: string): Promise<SessionToken | null>

  /**
   * Spends the refresh: deletes the row and says whether it was this call that deleted it. It is the
   * critical section of the rotation: two renewals with the same token do not win two
   * pairs.
   */
  abstract consume(token: SessionToken): Promise<boolean>

  /** Deletes a token of the account; another account's stays. */
  abstract revoke(userId: string, identifier: string): Promise<void>
}
