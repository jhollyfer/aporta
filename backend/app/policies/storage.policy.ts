import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import { STAFF_USER_ROLES, type Actor } from '@aporta/shared'

import type Storage from '#domain/storage/storage.entity'
import SessionScopedPolicy from '#policies/session-scoped-policy.base'

/**
 * Who downloads which file through the download route.
 *
 * The route exists because the `download` attribute of an `<a>` is ignored across
 * origins; it is not an alternative read path, and that is why it does not repeat the
 * site's rule. What the site shows comes out via a signed `url`, derived on read
 * of the resource that contains it - and whoever reaches that resource has already passed its
 * authorization.
 */
export default class StoragePolicy extends SessionScopedPolicy {
  /**
   * Whoever operates the panel downloads the whole collection. The rest only reaches the file that is
   * their own profile photo - the only one that belongs to an account, and which the session
   * account already carries in `avatarId`, without a new query.
   *
   * A missing file and someone else's file answer the same `404`: a `403`
   * would confirm to whoever probes that this uuid exists.
   *
   * A new role that does not operate the collection is born outside `STAFF_USER_ROLES` and falls on the
   * last line: closed by omission, not by someone remembering to come here.
   */
  download(actor: Actor, storage: Storage | null): AuthorizerResponse {
    if (!storage) return this.notFound()

    if (STAFF_USER_ROLES.includes(actor.role)) return true

    if (actor.avatarId === storage.id) return true

    return this.notFound()
  }

  private notFound(): AuthorizerResponse {
    return this.hidden('STORAGE_NOT_FOUND')
  }
}
