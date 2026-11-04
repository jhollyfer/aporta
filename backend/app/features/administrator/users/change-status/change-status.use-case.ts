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
import type { AdministratorUserChangeStatusPayload } from '#validators/administrator/users.validator'

type Payload = Merge<
  AdministratorUserChangeStatusPayload,
  Merge<IdentifierPayload, { readonly actor: Actor }>
>
type Response = Either<HTTPException, AdministratorUserShowResponse>

/**
 * Suspends (`INACTIVE`) or reactivates (`ACTIVE`) an account. Whether it is allowed is the
 * entity's, and so is dropping the sessions of the suspended account. Sign-in and token renewal
 * already refuse an inactive account (`canOpenSession`), so a suspended person is out at once.
 */
@inject()
export default class AdministratorUserChangeStatusUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly access: AdministratorUserAccess,
  ) {}

  async execute({ id, status, actor }: Payload): Promise<Response> {
    try {
      const user = await this.users.findById(id)

      if (!user) return left(AdministratorUserRefusal.notFound())

      const changed = user.changeStatus(
        status,
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
    logger.error({ err: cause }, '[administrator/users > change-status][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.ADMINISTRATOR_USER_CHANGE_STATUS_ERROR'),
      'ADMINISTRATOR_USER_CHANGE_STATUS_ERROR',
    )
  }
}
