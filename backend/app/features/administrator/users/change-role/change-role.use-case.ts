import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Actor,
  type AdministratorUserShowResponse,
  type Either,
  type Merge,
} from '@aporta/shared'

import Translation from '#core/translation'
import type { IdentifierPayload } from '#core/validator'
import HTTPException from '#exceptions/http.exception'
import AdministratorUserAccess from '#features/administrator/_shared.user-access'
import AdministratorUserRefusal from '#features/administrator/_shared.user-refusal'
import AdministratorUserPresenter from '#features/administrator/users/users.presenter'
import UserRepository from '#repositories/user/user.repository'
import type { AdministratorUserChangeRolePayload } from '#validators/administrator/users.validator'

type Payload = Merge<
  AdministratorUserChangeRolePayload,
  Merge<IdentifierPayload, { readonly actor: Actor }>
>
type Response = Either<HTTPException, AdministratorUserShowResponse>

/**
 * Gives an account another role. The route group already asked for the `ADMINISTRATOR`; whether
 * the change is allowed (not one's own account, not an owner with ads, not the last administrator)
 * is the entity's. The entity drops the sessions of the account, so the new role is the one the
 * person signs in with.
 */
@inject()
export default class AdministratorUserChangeRoleUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly access: AdministratorUserAccess,
  ) {}

  async execute({ id, role, actor }: Payload): Promise<Response> {
    try {
      const user = await this.users.findById(id)

      if (!user) return left(AdministratorUserRefusal.notFound())

      const changed = user.changeRole(
        role,
        await this.access.context(actor.id, id),
      )

      if (changed.isLeft())
        return left(AdministratorUserRefusal.http(changed.value))

      const saved = await this.users.save(user)

      if (saved.isLeft()) return left(this.failure(saved.value))

      return right(AdministratorUserPresenter.show(saved.value))
    } catch (error) {
      return left(this.failure(error))
    }
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[administrator/users > change-role][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.ADMINISTRATOR_USER_CHANGE_ROLE_ERROR'),
      'ADMINISTRATOR_USER_CHANGE_ROLE_ERROR',
    )
  }
}
