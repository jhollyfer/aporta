import type {
  Either,
  ActiveStatus,
  Merge,
  Paginated,
  StorageFileShowResponse,
  TrashedMode,
  USER_SORT_COLUMNS,
  UserRole,
} from '@aporta/shared'

import type { PageCriteria } from '#core/page-criteria'
import type RepositoryFailure from '#core/repository-failure'
import type { UniqueConflict } from '#core/unique-conflict'
import type User from '#domain/user/user.entity'

/**
 * The account as it is stored: the entity, the photo (a `storages` file still
 * without `url`) and the time stamps (`docs/DECISIONS.md` #19).
 */
export type UserRecord = {
  readonly user: User
  readonly avatar: StorageFileShowResponse | null
  readonly createdAt: Date
  readonly updatedAt: Date | null
}

export type UserSortColumn = (typeof USER_SORT_COLUMNS)[number]

/** The panel listing: search in name and email, role, status and trash. */
export type UserListCriteria = Merge<
  PageCriteria<UserSortColumn>,
  {
    readonly role?: UserRole
    readonly status?: ActiveStatus
    readonly trashed?: TrashedMode
  }
>

/**
 * The account persistence, by intent (`_standards/domain.md` §5.1), in the
 * house repository mold.
 *
 * The email is `UNIQUE` across the whole table, archived included, and that is why
 * email questions reach the trash. The sessions (`auth_access_tokens`,
 * `CASCADE`) are part of the account: `save` hashes the new password and drops the
 * sessions when the entity asks (`User.credentials()`), in the same transaction as the
 * row.
 */
export default abstract class UserRepository {
  /** The account for a write. Without `trashed`, only what is outside the trash. */
  /** How many are outside the trash: the panel counter. */
  abstract countAlive(): Promise<number>

  /** How many live `ADMINISTRATOR` accounts can still sign in: the count the last-administrator rule reads. */
  abstract countActiveAdministrators(): Promise<number>

  abstract findById(id: string, trashed?: TrashedMode): Promise<User | null>

  /** Who occupies the email, live or archived: creation reuses the archived one. */
  abstract findByEmail(email: string): Promise<User | null>

  /** Whether another account (live or archived) other than `exceptId` already uses the email. */
  abstract existsByEmail(email: string, exceptId: string): Promise<boolean>

  /** The account outside the trash, with the photo: the detail for the panel and the account itself. */
  abstract findRecord(id: string): Promise<UserRecord | null>

  /**
   * Whether the plain-text password is the account's saved one. It is the proof of identity that
   * password change requires: the session proves possession of the cookie, not who the person is.
   */
  /**
   * The account whose email and password match, live or not: deciding whether it signs in belongs to the
   * entity (`canOpenSession`). `null` is a wrong credential, without saying which
   * of the two. A database failure comes back as `RepositoryFailure`.
   */
  abstract findByCredentials(
    email: string,
    password: string,
  ): Promise<Either<RepositoryFailure, User | null>>

  abstract passwordMatches(id: string, password: string): Promise<boolean>

  abstract paginate(criteria: UserListCriteria): Promise<Paginated<UserRecord>>

  /** Writes the row (and the new password, and the session drop) and returns it as it ended up. */
  abstract save(
    user: User,
  ): Promise<Either<UniqueConflict | RepositoryFailure, UserRecord>>

  /** Deletes for good; the sessions go along via `CASCADE`. */
  abstract delete(user: User): Promise<void>
}
