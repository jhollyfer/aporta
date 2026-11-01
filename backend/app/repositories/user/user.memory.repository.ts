import {
  left,
  right,
  type ActiveStatus,
  type Paginated,
  type StorageFileShowResponse,
  type TrashedMode,
  type UserRole,
  type Either,
} from '@aporta/shared'

import MemoryRows, { type StoredRow } from '#core/memory-rows'
import type RepositoryFailure from '#core/repository-failure'
import { UNIQUE_CONFLICT, type UniqueConflict } from '#core/unique-conflict'
import User, { type UserProps } from '#domain/user/user.entity'
import UserRepository, {
  type UserListCriteria,
  type UserRecord,
} from '#repositories/user/user.repository'

type Row = StoredRow<UserProps>

/**
 * The in-memory account repository (`_standards/domain.md` §5.3): what the
 * use-case unit tests use, and the contract test runs the same cases against it
 * of Lucid. It guards the email `UNIQUE` like the database (error `23505`), the password
 * as received (there is nothing to hash here: nothing leaves this process) and the
 * open sessions of each account, which `save` drops when the entity asks.
 */
export default class UserMemoryRepository extends UserRepository {
  readonly #rows = new Map<string, Row>()
  readonly #passwords = new Map<string, string>()
  readonly #sessions = new Map<string, number>()
  readonly #avatars = new Map<string, StorageFileShowResponse>()

  /** The file in `storages` that `avatarId` can point to. */
  putAvatar(avatar: StorageFileShowResponse): void {
    this.#avatars.set(avatar.id, structuredClone(avatar))
  }

  /** An open session of the account, like a token in `auth_access_tokens`. */
  openSession(userId: string): void {
    this.#sessions.set(userId, this.sessions(userId) + 1)
  }

  /** How many sessions of the account remain open. */
  sessions(userId: string): number {
    return this.#sessions.get(userId) ?? 0
  }

  countAlive(): Promise<number> {
    return Promise.resolve(
      [...this.#rows.values()].filter((row) => row.deletedAt === null).length,
    )
  }

  findById(id: string, trashed?: TrashedMode): Promise<User | null> {
    const row = this.#rows.get(id)
    if (!row || !MemoryRows.inTrash(row, trashed)) return Promise.resolve(null)
    return Promise.resolve(this.record(row).user)
  }

  findByEmail(email: string): Promise<User | null> {
    const row = this.byEmail(email)
    if (!row) return Promise.resolve(null)
    return Promise.resolve(this.record(row).user)
  }

  existsByEmail(email: string, exceptId: string): Promise<boolean> {
    const row = this.byEmail(email)
    return Promise.resolve(row !== undefined && row.id !== exceptId)
  }

  findRecord(id: string): Promise<UserRecord | null> {
    const row = this.#rows.get(id)
    if (!row || row.deletedAt !== null) return Promise.resolve(null)
    return Promise.resolve(this.record(row))
  }

  findByCredentials(
    email: string,
    password: string,
  ): Promise<Either<RepositoryFailure, User | null>> {
    const row = this.byEmail(email)
    if (!row || this.#passwords.get(row.id) !== password)
      return Promise.resolve(right(null))
    return Promise.resolve(right(this.record(row).user))
  }

  passwordMatches(id: string, password: string): Promise<boolean> {
    return Promise.resolve(this.#passwords.get(id) === password)
  }

  paginate(criteria: UserListCriteria): Promise<Paginated<UserRecord>> {
    const rows = [...this.#rows.values()].filter(
      (row) =>
        MemoryRows.inTrash(row, criteria.trashed) &&
        this.matches(row.role, criteria.role) &&
        this.matches(row.status, criteria.status) &&
        MemoryRows.contains([row.name, row.email], criteria.search),
    )

    return Promise.resolve(
      MemoryRows.page(rows, criteria, {
        sortValue: (row) => row[criteria.sort],
        toItem: (row) => this.record(row),
      }),
    )
  }

  save(user: User): Promise<Either<UniqueConflict, UserRecord>> {
    const snapshot = user.snapshot()
    const taken = this.byEmail(snapshot.email)
    if (taken && taken.id !== snapshot.id)
      return Promise.resolve(left(UNIQUE_CONFLICT))

    const credentials = user.credentials()
    const stored = this.#rows.get(snapshot.id)
    let row = MemoryRows.stamp(snapshot, stored, new Date())

    // The new password is a column, and Lucid always writes a new hash: sending it
    // touches `updatedAt` even when it equals the previous one.
    if (credentials.password !== null) {
      if (stored) row = { ...row, updatedAt: new Date() }
      this.#passwords.set(snapshot.id, credentials.password)
    }

    if (credentials.revokeSessions) this.#sessions.delete(snapshot.id)

    this.#rows.set(row.id, row)

    return Promise.resolve(right(this.record(row)))
  }

  delete(user: User): Promise<void> {
    this.#rows.delete(user.id)
    this.#passwords.delete(user.id)
    this.#sessions.delete(user.id)

    return Promise.resolve()
  }

  private byEmail(email: string): Row | undefined {
    return [...this.#rows.values()].find((row) => row.email === email)
  }

  /** An absent filter lets everything through. */
  private matches(
    value: UserRole | ActiveStatus,
    filter: UserRole | ActiveStatus | undefined,
  ): boolean {
    return filter === undefined || value === filter
  }

  private record(row: Row): UserRecord {
    const { createdAt, updatedAt, ...props } = structuredClone(row)
    let avatar: StorageFileShowResponse | null = null
    const file = row.avatarId && this.#avatars.get(row.avatarId)
    if (file) avatar = structuredClone(file)

    return { user: User.restore(props), avatar, createdAt, updatedAt }
  }
}
