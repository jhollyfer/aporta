import {
  ACTIVE_STATUS,
  left,
  right,
  USER_ROLE,
  type ActiveStatus,
  type Either,
  type Merge,
  type UserRole,
} from '@aporta/shared'

import type {
  UserAccessError,
  UserAlreadyArchived,
  UserNotArchived,
  UserNotVerifiable,
} from './user.errors.ts'

/**
 * The account state. `avatarId` points to `storages`, another aggregate, and
 * comes in only by id (`_standards/domain.md` §1).
 *
 * The password is not here: stored, it is a hash, and the hash is persistence
 * mechanics (the model's `withAuthFinder` mixin). The entity only carries the **new**
 * password, in clear text, until the repository saves it (`credentials()`).
 */
export type UserProps = {
  readonly id: string
  name: string
  email: string
  role: UserRole
  status: ActiveStatus
  avatarId: string | null
  /**
   * The moment the staff confirmed the person behind the account, the "verified owner" seal the
   * storefront shows on every ad of the account. Null is "not verified".
   */
  verifiedAt: Date | null
  deletedAt: Date | null
}

/**
 * What the panel (or the account itself) may change. A missing key means "leave alone";
 * `avatarId: null` removes the photo; `password` is the new password, in clear text.
 */
export type UserPatch = {
  readonly name?: string
  readonly email?: string
  readonly password?: string
  readonly role?: UserRole
  readonly status?: ActiveStatus
  readonly avatarId?: string | null
}

/** What the panel writes on creation. A missing `status` is born `ACTIVE`. */
export type UserCreateInput = Merge<
  Required<Pick<UserPatch, 'name' | 'email' | 'password' | 'role'>>,
  Merge<Pick<UserPatch, 'status' | 'avatarId'>, { readonly id: string }>
>

/** What the next save must do besides the columns. */
export type UserCredentials = {
  /** The new password in clear text, for the repository to hash; `null` means "leave alone". */
  readonly password: string | null
  /** Whether the account's open sessions drop along with the save. */
  readonly revokeSessions: boolean
}

/**
 * What the entity cannot know by itself and the administrator's access change depends on: who is
 * acting, how many active administrators exist (this account included, when it is one) and whether
 * the account still has an ad outside the trash. The use-case reads them from the repositories.
 */
export type AccessChangeContext = {
  readonly actorId: string
  readonly activeAdministrators: number
  readonly hasLiveListings: boolean
}

/**
 * The account of whoever operates the panel. The business rule living here is about
 * access: changing email, password or role, deactivating or archiving the account, drops the open
 * sessions. Without it, switching off someone's access would switch off nothing: the guard
 * checks the token, not the account state.
 */
export default class User {
  #password: string | null = null
  #revokeSessions = false

  private constructor(private readonly props: UserProps) {}

  static create(input: UserCreateInput): User {
    const user = new User({
      id: input.id,
      name: input.name,
      email: input.email,
      role: input.role,
      status: input.status ?? ACTIVE_STATUS.ACTIVE,
      avatarId: input.avatarId ?? null,
      verifiedAt: null,
      deletedAt: null,
    })
    user.#password = input.password
    return user
  }

  /** Rehydration by the repository: the data already passed the invariants when it was saved. */
  static restore(props: UserProps): User {
    return new User({ ...props })
  }

  /** Partial edit: only what arrives changes. A new email, password or role, or a deactivation, drops the sessions. */
  update(patch: UserPatch): User {
    if (patch.email !== undefined && patch.email !== this.props.email) {
      this.props.email = patch.email
      this.#revokeSessions = true
    }

    if (patch.password !== undefined) {
      this.#password = patch.password
      this.#revokeSessions = true
    }

    if (patch.name !== undefined) this.props.name = patch.name
    // A new role drops the sessions too (`_standards/backend.md` §4.10): the token outlives
    // the privilege it was issued with, and an editor promoted or demoted must sign in again.
    if (patch.role !== undefined && patch.role !== this.props.role) {
      this.props.role = patch.role
      this.#revokeSessions = true
    }

    // Deactivating drops the sessions too (CWE-613): the guard checks the token, not the
    // status, so tokens kept through an inactive spell would come back valid on reactivation.
    if (patch.status !== undefined) {
      if (
        patch.status === ACTIVE_STATUS.INACTIVE &&
        this.props.status !== ACTIVE_STATUS.INACTIVE
      )
        this.#revokeSessions = true

      this.props.status = patch.status
    }
    if (patch.avatarId !== undefined) this.props.avatarId = patch.avatarId

    return this
  }

  /**
   * The administrator gives the account another role. Refuses, in this order: the account of the
   * administrator himself (nobody demotes themselves by accident, and a mistaken click would lock
   * the panel); an owner who still has an ad outside the trash (staff has no ads of its own, and the
   * ad would be left without anyone who may edit it); and the last active administrator. Asking for
   * the role the account already has changes nothing and is not an error. A new role drops the
   * sessions (`update`).
   */
  changeRole(
    role: UserRole,
    context: AccessChangeContext,
  ): Either<UserAccessError, User> {
    if (role === this.props.role) return right(this)

    const refusal = this.accessRefusal(context, {
      leavesOwnership: this.props.role === USER_ROLE.OWNER,
      leavesAdministration: role !== USER_ROLE.ADMINISTRATOR,
    })
    if (refusal) return left(refusal)

    return right(this.update({ role }))
  }

  /**
   * Suspends (`INACTIVE`) or reactivates (`ACTIVE`) the account. Suspending follows the same
   * refusals as a demotion, except the ad rule: a suspended owner keeps the ads, only the sign-in
   * is gone. Suspending drops the sessions (`update`); reactivating changes nothing else.
   */
  changeStatus(
    status: ActiveStatus,
    context: AccessChangeContext,
  ): Either<UserAccessError, User> {
    if (status === this.props.status) return right(this)

    if (status === ACTIVE_STATUS.ACTIVE) return right(this.update({ status }))

    const refusal = this.accessRefusal(context, {
      leavesOwnership: false,
      leavesAdministration: true,
    })
    if (refusal) return left(refusal)

    return right(this.update({ status }))
  }

  private accessRefusal(
    context: AccessChangeContext,
    leaves: {
      readonly leavesOwnership: boolean
      readonly leavesAdministration: boolean
    },
  ): UserAccessError | null {
    if (context.actorId === this.props.id)
      return { code: 'USER_OWN_ACCESS_CHANGE' }

    if (leaves.leavesOwnership && context.hasLiveListings)
      return { code: 'USER_OWNS_LISTINGS' }

    const administers =
      this.props.role === USER_ROLE.ADMINISTRATOR &&
      this.props.status === ACTIVE_STATUS.ACTIVE &&
      this.props.deletedAt === null

    if (
      administers &&
      leaves.leavesAdministration &&
      context.activeAdministrators <= 1
    )
      return { code: 'USER_LAST_ADMINISTRATOR' }

    return null
  }

  /**
   * Reuses the archived account that occupies the email requested on creation
   * (`_standards/backend.md` §4.8, revive-on-create): it leaves the trash with the new
   * data and keeps `id` and `createdAt`. The live account refuses: it is the one that already
   * exists.
   */
  revive(patch: UserPatch): Either<UserNotArchived, User> {
    if (this.props.deletedAt === null)
      return left({ code: 'USER_NOT_ARCHIVED' })

    this.update(patch)
    this.props.deletedAt = null
    return right(this)
  }

  /** Sends to the trash and drops the sessions: the guard does not know `deleted_at`. */
  archive(at: Date): Either<UserAlreadyArchived, User> {
    if (this.props.deletedAt !== null)
      return left({ code: 'USER_ALREADY_ARCHIVED' })

    this.props.deletedAt = at
    this.#revokeSessions = true
    return right(this)
  }

  unarchive(): Either<UserNotArchived, User> {
    if (this.props.deletedAt === null)
      return left({ code: 'USER_NOT_ARCHIVED' })

    this.props.deletedAt = null
    return right(this)
  }

  /** Only what is already in the trash is deleted for good. */
  deletable(): Either<UserNotArchived, User> {
    if (this.props.deletedAt === null)
      return left({ code: 'USER_NOT_ARCHIVED' })

    return right(this)
  }

  /**
   * Gives the account the "verified owner" seal. Only a live `OWNER` account carries it: the seal
   * tells a visitor "the platform confirmed this advertiser", and it means nothing on an account
   * that does not advertise. Verifying twice keeps the first instant, so repeating the call does
   * not rewrite when the person was confirmed.
   */
  verify(at: Date): Either<UserNotVerifiable, User> {
    if (this.props.role !== USER_ROLE.OWNER || this.props.deletedAt !== null)
      return left({ code: 'USER_NOT_VERIFIABLE' })

    this.props.verifiedAt ??= at
    return right(this)
  }

  /** Takes the seal away. Always possible: removing trust never needs a reason the entity checks. */
  unverify(): User {
    this.props.verifiedAt = null
    return this
  }

  /**
   * Whether the account may open or renew a session: live and `ACTIVE`. Archived and
   * inactive get the same `401` as a wrong password, so the response
   * neither confirms the account exists nor why it was refused.
   */
  canOpenSession(): boolean {
    return (
      this.props.deletedAt === null &&
      this.props.status === ACTIVE_STATUS.ACTIVE
    )
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<UserProps> {
    return { ...this.props }
  }

  /** What the save does besides the columns: hash the new password and drop sessions. */
  credentials(): UserCredentials {
    return { password: this.#password, revokeSessions: this.#revokeSessions }
  }
}
