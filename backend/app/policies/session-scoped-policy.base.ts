import { AuthorizationResponse, BasePolicy } from '@adonisjs/bouncer'

/**
 * Policy base: the two denials the API returns, with a stable `code`.
 *
 * The `code` travels in the response translation (`errors.<CODE>`), and
 * `app/exceptions/handler.ts` returns it in the house envelope, in the request
 * language. Bouncer's `AuthorizationResponse` only carries a message and
 * status; without this base each policy would build the pair by hand and the `code` would diverge.
 *
 * - `hidden`: the record's existence is a secret. A missing record and a record
 *   the `actor` cannot reach answer **the same** (same status, `code` and
 *   message), so the response does not allow enumerating ids
 *   (`_standards/backend.md` §4.6).
 * - `forbidden`: the `actor` sees the record and cannot act on it.
 */
export default abstract class SessionScopedPolicy extends BasePolicy {
  protected hidden(code: string): AuthorizationResponse {
    return AuthorizationResponse.deny(code, 404).t(`errors.${code}`)
  }

  protected forbidden(code: string): AuthorizationResponse {
    return AuthorizationResponse.deny(code, 403).t(`errors.${code}`)
  }
}
