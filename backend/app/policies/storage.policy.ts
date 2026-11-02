import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import { STAFF_USER_ROLES, type Actor } from '@aporta/shared'

import type Storage from '#domain/storage/storage.entity'
import SessionScopedPolicy from '#policies/session-scoped-policy.base'

/**
 * Who reaches which file: the whole collection for the staff, and for an owner of properties only
 * what he uploaded.
 *
 * The file is a neutral record (nothing in the table says which feature uses it), so before the
 * owner role entered `/storages` the group was closed to the staff, who see everything by job.
 * Opening it to the `OWNER` is what makes ownership matter: `ownerId` is the account that opened
 * the upload, and the rule below is the whole reason it is recorded.
 *
 * A missing file and someone else's file answer the same `404`: a `403` would confirm to whoever
 * probes that this uuid exists.
 *
 * A new role that does not operate the collection is born outside `STAFF_USER_ROLES` and falls on
 * the last line: it reaches its own files and nothing else, closed by omission, not by someone
 * remembering to come here.
 */
export default class StoragePolicy extends SessionScopedPolicy {
  /** The detail, the resume of an upload, its confirmation and its deletion: one rule for the four. */
  show(actor: Actor, storage: Storage | null): AuthorizerResponse {
    return this.reach(actor, storage)
  }

  complete(actor: Actor, storage: Storage | null): AuthorizerResponse {
    return this.reach(actor, storage)
  }

  parts(actor: Actor, storage: Storage | null): AuthorizerResponse {
    return this.reach(actor, storage)
  }

  delete(actor: Actor, storage: Storage | null): AuthorizerResponse {
    return this.reach(actor, storage)
  }

  /**
   * Who downloads which file through the download route.
   *
   * The route exists because the `download` attribute of an `<a>` is ignored across origins; it
   * is not an alternative read path. What the site shows comes out via a signed `url`, derived on
   * read of the resource that contains it - and whoever reaches that resource has already passed
   * its authorization. Besides the files the actor sent, the account's own profile photo stays
   * reachable, as it was before ownership: the session already carries it in `avatarId`.
   */
  download(actor: Actor, storage: Storage | null): AuthorizerResponse {
    if (storage && actor.avatarId === storage.id) return true

    return this.reach(actor, storage)
  }

  private reach(actor: Actor, storage: Storage | null): AuthorizerResponse {
    if (!storage) return this.notFound()

    if (STAFF_USER_ROLES.includes(actor.role)) return true

    if (storage.snapshot().ownerId === actor.id) return true

    return this.notFound()
  }

  private notFound(): AuthorizerResponse {
    return this.hidden('STORAGE_NOT_FOUND')
  }
}
