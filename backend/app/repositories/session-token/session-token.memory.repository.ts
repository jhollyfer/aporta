import SessionTokenRepository, {
  type SessionToken,
  type SessionTokens,
} from '#repositories/session-token/session-token.repository'

/** A token stored by the fake: whose it is and whether it is a refresh one. */
type StoredToken = { readonly userId: string; readonly refresh: boolean }

/**
 * The in-memory session tokens for the unit tests (`_standards/solid.md` §2),
 * with the same behavior as `SessionTokenLucidRepository`: the token value is its
 * own identifier (`fake-<n>`), the access one does not count as a refresh, and
 * spending the same refresh twice only works the first time.
 */
export default class SessionTokenMemoryRepository extends SessionTokenRepository {
  #issued = 0
  readonly #tokens = new Map<string, StoredToken>()

  /** How many live tokens the account has. */
  count(userId: string): number {
    return [...this.#tokens.values()].filter((token) => token.userId === userId)
      .length
  }

  issue(userId: string): Promise<SessionTokens> {
    return Promise.resolve({
      accessToken: this.#create(userId, false),
      refreshToken: this.#create(userId, true),
    })
  }

  findAccess(value: string): Promise<SessionToken | null> {
    const token = this.#tokens.get(value)
    if (!token || token.refresh) return Promise.resolve(null)
    return Promise.resolve({ identifier: value, userId: token.userId })
  }

  findRefresh(value: string): Promise<SessionToken | null> {
    const token = this.#tokens.get(value)
    if (!token || !token.refresh) return Promise.resolve(null)
    return Promise.resolve({ identifier: value, userId: token.userId })
  }

  consume(token: SessionToken): Promise<boolean> {
    const stored = this.#tokens.get(token.identifier)
    if (!stored || stored.userId !== token.userId) return Promise.resolve(false)
    this.#tokens.delete(token.identifier)
    return Promise.resolve(true)
  }

  revoke(userId: string, identifier: string): Promise<void> {
    const stored = this.#tokens.get(identifier)
    if (stored && stored.userId === userId) this.#tokens.delete(identifier)

    return Promise.resolve()
  }

  #create(userId: string, refresh: boolean): string {
    this.#issued += 1
    const value = `fake-${this.#issued}`
    this.#tokens.set(value, { userId, refresh })
    return value
  }
}
