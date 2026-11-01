import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import type { Actor } from '@aporta/shared'

import type User from '#domain/user/user.entity'
import SessionScopedPolicy from '#policies/session-scoped-policy.base'

/**
 * Who can operate which account in the panel.
 *
 * It is the half that `role.middleware` cannot express. It only looks at the role
 * of **whoever calls**, and the rule here depends on **who the target is**: an
 * administrator operates accounts, but not their own through this resource.
 *
 * The per-record rule lives here, once, and not in an `if` repeated in each use
 * case, where the error text could diverge between `update`, `archive` and `delete` without
 * anything pointing it out. The check goes through
 * `ctx.bouncer.with(UserPolicy)` in the controller (`backend.md` §4.6).
 *
 * A missing account answers `404`, the same as the use-case: for the panel the account's
 * existence is not a secret, but the response does not change shape depending on the path.
 * The own account is seen and refused: `403`, with one `code` per action.
 *
 * **No owner rule**: here the roles are `ADMINISTRATOR` and `EDITOR`, and there is no
 * `OWNER` to protect.
 */
export default class UserPolicy extends SessionScopedPolicy {
  /**
   * The role and status of the own account are not changed through here.
   *
   * It is not to protect the data, it is to close self-promotion and
   * self-deactivation: the validator refuses values outside the list, but does not know
   * **who** is calling. The own profile is edited at `/account`, which is another
   * path and accepts neither `role` nor `status`.
   */
  changeAccess(actor: Actor, target: User | null): AuthorizerResponse {
    if (!target) return this.missing()

    if (this.isSelf(actor, target))
      return this.forbidden('SELF_ACCESS_FORBIDDEN')

    return true
  }

  /** Archiving oneself removes from the panel whoever was administering. */
  archive(actor: Actor, target: User | null): AuthorizerResponse {
    if (!target) return this.missing()

    if (this.isSelf(actor, target))
      return this.forbidden('SELF_ARCHIVE_FORBIDDEN')

    return true
  }

  /** Deleting oneself is irreversible, and the fix would be to run the seeder. */
  delete(actor: Actor, target: User | null): AuthorizerResponse {
    if (!target) return this.missing()

    if (this.isSelf(actor, target))
      return this.forbidden('SELF_DELETE_FORBIDDEN')

    return true
  }

  private isSelf(actor: Actor, target: User): boolean {
    return actor.id === target.id
  }

  private missing(): AuthorizerResponse {
    return this.hidden('USER_NOT_FOUND')
  }
}
