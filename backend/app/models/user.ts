import {
  type AccessToken,
  DbAccessTokensProvider,
} from '@adonisjs/auth/access_tokens'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { compose } from '@adonisjs/core/helpers'
import hash from '@adonisjs/core/services/hash'
import { belongsTo, column, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import {
  TRASHED_MODE,
  type ActiveStatus,
  type TrashedMode,
  type UserRole,
} from '@aporta/shared'

import { UserSchema } from '#database/schema'
import Storage from '#models/storage'

/**
 * The session tokens table. The `@adonisjs/auth` provider receives it by
 * option, and revocation inside a transaction (`UserLucidRepository.save`) reads
 * it from here: the provider does not accept a transaction, and the name written in two places
 * would silently diverge. It lives in the model because the model declares the
 * provider.
 */
export const ACCESS_TOKEN_TABLE = 'auth_access_tokens'

/**
 * The mixin does two things that must go together: it generates the password hash before
 * saving and exposes `verifyCredentials`, which looks up by uid and checks the hash in
 * constant time. Separating them is how the creation path that saves a plain-text
 * password is born.
 */
const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(UserSchema, AuthFinder) {
  /**
   * Only what has not been archived.
   *
   * The filter is a security one, and that is why it lives in a single place: written by hand in each
   * query, it depends on someone remembering, and the query that forgets returns an
   * archived record without warning. A query that needs to see the archived one asks for
   * `trashed` on purpose, and one that does not ask cannot forget.
   */
  static notDeleted = scope((query) => {
    query.whereNull('deletedAt')
  })

  /**
   * Only what has been archived: the mirror of `notDeleted`, for `unarchive` and the
   * restore screen. Same reason to live here - the filter written by hand
   * outside the model is enforced by `pattern:check`.
   */
  static onlyDeleted = scope((query) => {
    query.whereNotNull('deletedAt')
  })

  /**
   * The `?trashed` cut as a scope, for the repository to choose by the criterion's
   * mode (`_standards/backend.md` §4.8): absent means the live ones, `only` the
   * trash and `with` both. _doc-lib/lucid.md#model-query-scopes.
   */
  static trashed = scope((query, mode?: TrashedMode) => {
    if (mode === TRASHED_MODE.WITH) return

    if (mode === TRASHED_MODE.ONLY) {
      query.whereNotNull('deletedAt')
      return
    }

    query.whereNull('deletedAt')
  })

  static accessTokens = DbAccessTokensProvider.forModel(User, {
    table: ACCESS_TOKEN_TABLE,
  })

  /**
   * The token that authenticated **this** request, filled in by the cookie
   * guard. Outside a request cycle it does not exist, and that is why it is optional.
   */
  declare currentAccessToken?: AccessToken

  /**
   * Redeclared only to narrow the type: `database/schema.ts` is generated from the
   * columns and hands over every enum as `string`. Without this, comparing `role` with a
   * wrong literal would compile and only show up when Postgres refused the
   * write.
   */
  @column()
  declare role: UserRole

  @column()
  declare status: ActiveStatus

  /**
   * Avatar, at most one. Relation declared by hand: `database/schema.ts` is
   * generated from the columns and knows no relationship at all.
   *
   * Whoever attaches it keeps the reference - it is what allows a single file
   * table, with no "owner type" column.
   */
  @belongsTo(() => Storage, { foreignKey: 'avatarId' })
  declare avatar: BelongsTo<typeof Storage>
}
