import { errors as authErrors } from '@adonisjs/auth'
import { inject } from '@adonisjs/core'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import {
  TRASHED_MODE,
  left,
  right,
  type Either,
  type Paginated,
  type TrashedMode,
} from '@aporta/shared'

import RepositoryFailure from '#core/repository-failure'
import TransactionContext from '#core/transaction-context'
import type { UniqueConflict } from '#core/unique-conflict'
import User from '#domain/user/user.entity'
import UserModel, { ACCESS_TOKEN_TABLE } from '#models/user'
import LucidMapping from '#repositories/shared/lucid-mapping'
import UserRepository, {
  type UserListCriteria,
  type UserRecord,
} from '#repositories/user/user.repository'

/**
 * The account repository over Lucid: it is through here, and not through the feature, that
 * the use-case reaches `#models/user` (`_standards/architecture.md` §2), with the
 * mapper as a private method (`_standards/domain.md` §5.2).
 *
 * The queries are the ones the use-cases used to do (`_standards/backend.md` §11.1,
 * step 2). `save` writes in a transaction the row (`updateOrCreate`,
 * _doc-lib/lucid.md#crud-operations), the new plain-text password, which the
 * `withAuthFinder` mixin hashes on `save`
 * (_doc-lib/adonisjs.md#guides/auth/verifying-user-credentials), and the session drop when the entity asks:
 * separately, the failure of the second would leave the password changed with the old session
 * still valid (_doc-lib/lucid.md#transactions).
 */
@inject()
export default class UserLucidRepository extends UserRepository {
  constructor(private readonly transaction: TransactionContext) {
    super()
  }

  async countAlive(): Promise<number> {
    return LucidMapping.count(
      UserModel.query().withScopes((scopes) => scopes.notDeleted()),
    )
  }

  async findById(id: string, trashed?: TrashedMode): Promise<User | null> {
    const row = await UserModel.query()
      .where('id', id)
      .withScopes((scopes) => scopes.trashed(trashed))
      .first()

    if (!row) return null
    return this.toEntity(row)
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await UserModel.query()
      .where('email', email)
      .withScopes((scopes) => scopes.trashed(TRASHED_MODE.WITH))
      .first()

    if (!row) return null
    return this.toEntity(row)
  }

  async existsByEmail(email: string, exceptId: string): Promise<boolean> {
    const row = await UserModel.query()
      .where('email', email)
      .whereNot('id', exceptId)
      .withScopes((scopes) => scopes.trashed(TRASHED_MODE.WITH))
      .first()

    return row !== null
  }

  async findRecord(id: string): Promise<UserRecord | null> {
    const row = await UserModel.query()
      .where('id', id)
      .withScopes((scopes) => scopes.notDeleted())
      .preload('avatar')
      .first()

    if (!row) return null
    return this.toRecord(row)
  }

  /**
   * `verifyCredentials` of the `withAuthFinder` mixin: compares in constant time,
   * and spends the same hash when the email does not exist, so the response time
   * does not reveal which emails exist
   * (_doc-lib/adonisjs.md#guides/auth/verifying-user-credentials). Only a wrong
   * credential becomes `null`; any other failure becomes
   * `RepositoryFailure`.
   */
  async findByCredentials(
    email: string,
    password: string,
  ): Promise<Either<RepositoryFailure, User | null>> {
    try {
      const row = await UserModel.verifyCredentials(email, password)
      return right(this.toEntity(row))
    } catch (error) {
      if (error instanceof authErrors.E_INVALID_CREDENTIALS) return right(null)

      return left(RepositoryFailure.of(error))
    }
  }

  /**
   * The hash stays in here: the entity never carries it. `hash.verify` is the
   * same one the use-cases used to call (_doc-lib/adonisjs.md#guides/security/hashing).
   */
  async passwordMatches(id: string, password: string): Promise<boolean> {
    const row = await UserModel.query()
      .where('id', id)
      .select('password')
      .first()

    if (!row) return false
    return hash.verify(row.password, password)
  }

  async paginate(criteria: UserListCriteria): Promise<Paginated<UserRecord>> {
    const query = UserModel.query()
      .preload('avatar')
      .withScopes((scopes) => scopes.trashed(criteria.trashed))

    if (criteria.role) query.where('role', criteria.role)
    if (criteria.status) query.where('status', criteria.status)

    // Name and email. The `OR` goes inside the `where`: loose, it would escape the
    // trash filter and the role and status ones.
    if (criteria.search) {
      const search = `%${criteria.search}%`

      query.where((builder) => {
        builder.whereILike('name', search).orWhereILike('email', search)
      })
    }

    return LucidMapping.page(query, criteria, (row) => this.toRecord(row))
  }

  async save(
    user: User,
  ): Promise<Either<UniqueConflict | RepositoryFailure, UserRecord>> {
    return LucidMapping.unlessUnique(this.persist(user))
  }

  private async persist(user: User): Promise<UserRecord> {
    const credentials = user.credentials()
    const columns = this.toRow(user)

    // The password only goes in the write when the entity changed it.
    if (credentials.password !== null)
      Object.assign(columns, { password: credentials.password })

    const row = await db.transaction(async (trx) => {
      const saved = await UserModel.updateOrCreate({ id: user.id }, columns, {
        client: trx,
      })

      if (credentials.revokeSessions)
        await trx
          .from(ACCESS_TOKEN_TABLE)
          .where('tokenable_id', user.id)
          .delete()

      return saved
    })

    // `status` may have come from the `DEFAULT`, and the `INSERT` only returns the key:
    // without the refresh the response would come out without it. The photo is the current one.
    await row.refresh()
    await row.load('avatar')

    return this.toRecord(row)
  }

  async delete(user: User): Promise<void> {
    await UserModel.query({ client: this.transaction.client() })
      .where('id', user.id)
      .delete()
  }

  private toRecord(row: UserModel): UserRecord {
    return {
      user: this.toEntity(row),
      avatar: LucidMapping.file(row.avatar),
      createdAt: row.createdAt.toJSDate(),
      updatedAt: LucidMapping.date(row.updatedAt),
    }
  }

  private toEntity(row: UserModel): User {
    return User.restore({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      avatarId: row.avatarId,
      verifiedAt: LucidMapping.date(row.verifiedAt),
      deletedAt: LucidMapping.date(row.deletedAt),
    })
  }

  /** The columns the entity decides; the password only goes in when there is a new one. */
  private toRow(user: User) {
    const snapshot = user.snapshot()

    return {
      name: snapshot.name,
      email: snapshot.email,
      role: snapshot.role,
      status: snapshot.status,
      avatarId: snapshot.avatarId,
      verifiedAt: LucidMapping.dateTime(snapshot.verifiedAt),
      deletedAt: LucidMapping.dateTime(snapshot.deletedAt),
    }
  }
}
