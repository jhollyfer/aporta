import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AccountProfileUpdateResponse,
  type Actor,
  type Either,
  type Merge,
} from '@aporta/shared'

import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import ProfileRefusal from '#features/account/profile/_shared.profile-refusal'
import ProfilePresenter from '#features/account/profile/profile.presenter'
import StorageRepository from '#repositories/storage/storage.repository'
import UserRepository from '#repositories/user/user.repository'
import StorageContract from '#services/storage/storage.contract'
import type { AccountProfileUpdatePayload } from '#validators/account/profile.validator'

/** The session account: the guard already read it, excluding archived and inactive. */
type Payload = Merge<AccountProfileUpdatePayload, { readonly actor: Actor }>
type Response = Either<HTTPException, AccountProfileUpdateResponse>

/**
 * Edits the account itself. Changing email or password drops all sessions,
 * including this request's: the entity asks, the repository saves the account and
 * the drop in one transaction.
 */
@inject()
export default class AccountProfileUpdateUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly storages: StorageRepository,
    private readonly storage: StorageContract,
  ) {}

  // `currentPassword` leaves the payload here: it is proof of identity, not a
  // column.
  async execute({
    actor,
    currentPassword,
    ...payload
  }: Payload): Promise<Response> {
    try {
      // The question reaches archived ones: the email `unique` holds for the
      // whole table, and without it the save would blow up the constraint.
      if (
        payload.email &&
        payload.email !== actor.email &&
        (await this.users.existsByEmail(payload.email, actor.id))
      )
        return left(this.conflict())

      // Before the write: `avatar_id` is a foreign key, and `allUploaded`
      // also refuses what is still `PENDING` - attaching before confirmation
      // would publish a half-uploaded photo.
      if (payload.avatarId) {
        if (!(await this.storages.allUploaded([payload.avatarId])))
          return left(
            ProfileRefusal.http({
              code: 'STORAGE_NOT_FOUND',
              field: 'avatarId',
            }),
          )
      }

      // Before any other password rule: it is the proof of identity. The
      // `middleware.auth()` proves possession of the cookie, and a hijacked cookie
      // would change the password without the account owner having said anything. That
      // `currentPassword` exists when `password` exists is guaranteed by the validator
      // (`requiredIfExists`).
      if (
        payload.password &&
        (!currentPassword ||
          !(await this.users.passwordMatches(actor.id, currentPassword)))
      )
        return left(
          HTTPException.UnprocessableEntity(
            Translation.t('errors.CURRENT_PASSWORD_INVALID'),
            'CURRENT_PASSWORD_INVALID',
            {
              currentPassword: Translation.t('fields.CURRENT_PASSWORD_INVALID'),
            },
          ),
        )

      if (
        payload.password &&
        (await this.users.passwordMatches(actor.id, payload.password))
      )
        return left(
          HTTPException.UnprocessableEntity(
            Translation.t('errors.PASSWORD_SAME_AS_CURRENT'),
            'PASSWORD_SAME_AS_CURRENT',
            {
              password: Translation.t('fields.PASSWORD_SAME_AS_CURRENT'),
            },
          ),
        )

      const user = await this.users.findById(actor.id)

      // The guard just read this live account; vanishing here is an unexpected failure.
      if (!user) return left(this.failure(new Error('session account missing')))

      // An absent field means "leave alone": `PUT` is truly partial.
      user.update(payload)

      const saved = await this.users.save(user)

      if (saved.isLeft()) {
        const fact = saved.value

        if (fact.code === 'REPOSITORY_FAILURE')
          return left(this.failure(fact.cause))

        return left(this.conflict())
      }

      const record = saved.value

      return right(
        ProfilePresenter.show(
          record,
          await this.storage.signFile(record.avatar),
        ),
      )
    } catch (error) {
      return left(this.failure(error))
    }
  }

  private conflict(): HTTPException {
    return HTTPException.Conflict(
      Translation.t('errors.USER_ALREADY_EXISTS'),
      'USER_ALREADY_EXISTS',
      {
        email: Translation.t('fields.PROFILE_USER_ALREADY_EXISTS'),
      },
    )
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[account/profile > update][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.ACCOUNT_PROFILE_UPDATE_ERROR'),
      'ACCOUNT_PROFILE_UPDATE_ERROR',
    )
  }
}
