import type SessionTokenMemoryRepository from '#repositories/session-token/session-token.memory.repository'
import SessionTokenRepository, {
  type SessionToken,
  type SessionTokens,
} from '#repositories/session-token/session-token.repository'

/**
 * The session tokens when the auth package hands over no secret for the freshly created token:
 * after `refuseFromNowOn`, `issue` answers `null` (`SessionTokenRepository.issue`), and the
 * use-cases that open or renew a session must turn it into a `500` instead of delivering an
 * empty pair. Before it, the store is the in-memory one, so a test can hold a valid refresh
 * first.
 */
export class RefusingSessionTokens extends SessionTokenRepository {
  #refusing = false

  constructor(private readonly tokens: SessionTokenMemoryRepository) {
    super()
  }

  refuseFromNowOn(): void {
    this.#refusing = true
  }

  issue(userId: string): Promise<SessionTokens | null> {
    if (this.#refusing) return Promise.resolve(null)

    return this.tokens.issue(userId)
  }

  findAccess(value: string): Promise<SessionToken | null> {
    return this.tokens.findAccess(value)
  }

  findRefresh(value: string): Promise<SessionToken | null> {
    return this.tokens.findRefresh(value)
  }

  consume(token: SessionToken): Promise<boolean> {
    return this.tokens.consume(token)
  }

  revoke(userId: string, identifier: string): Promise<void> {
    return this.tokens.revoke(userId, identifier)
  }
}
