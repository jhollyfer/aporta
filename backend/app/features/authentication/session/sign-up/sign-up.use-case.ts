import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  USER_ROLE,
  left,
  right,
  type AccountProfileShowResponse,
  type Either,
} from '@aporta/shared'

import Translation from '#core/translation'
import User from '#domain/user/user.entity'
import HTTPException from '#exceptions/http.exception'
import ProfilePresenter from '#features/_shared.profile.presenter'
import UserRepository from '#repositories/user/user.repository'
import IdGeneratorContract from '#services/id-generator/id-generator.contract'
import type { AuthenticationSessionSignUpPayload } from '#validators/authentication/session.validator'

type Payload = AuthenticationSessionSignUpPayload
type Response = Either<HTTPException, AccountProfileShowResponse>

/**
 * Creates the account of an owner who registers by themselves.
 *
 * The role is not read from the payload: an account that signs itself up is always an
 * `OWNER`, and a role the client could send would be a role the client could choose. It does
 * not open a session either: the client signs in right after, so the cookie pair has a single
 * door (`sign-in`) and its throttles.
 *
 * The email question reaches archived accounts, as in the profile update: the column is
 * `UNIQUE` for the whole table, and a trashed account that held the email would otherwise blow
 * up the constraint as a 500. It is the same `USER_ALREADY_EXISTS` of `account/profile/update`.
 */
@inject()
export default class AuthenticationSessionSignUpUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly ids: IdGeneratorContract,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const id = this.ids.next()

      if (await this.users.existsByEmail(payload.email, id))
        return left(this.conflict())

      const user = User.create({
        id,
        name: payload.name,
        email: payload.email,
        password: payload.password,
        role: USER_ROLE.OWNER,
      })

      const saved = await this.users.save(user)

      if (saved.isLeft()) {
        const fact = saved.value

        if (fact.code === 'REPOSITORY_FAILURE')
          return left(this.failure(fact.cause))

        // The race the question above cannot close: two sign-ups with the same email passing
        // it together, and the `UNIQUE` refusing the second.
        return left(this.conflict())
      }

      // A brand-new account has no photo, so there is no file to sign.
      return right(ProfilePresenter.show(saved.value, null))
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

  /** Nothing from the payload goes to the log: the received password would end up in it. */
  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[authentication/session > sign-up][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.AUTHENTICATION_SESSION_SIGN_UP_ERROR'),
      'AUTHENTICATION_SESSION_SIGN_UP_ERROR',
    )
  }
}
