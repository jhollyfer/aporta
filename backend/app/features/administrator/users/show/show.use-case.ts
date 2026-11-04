import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorUserShowResponse,
  type Either,
} from '@aporta/shared'

import Translation from '#core/translation'
import type { IdentifierPayload } from '#core/validator'
import HTTPException from '#exceptions/http.exception'
import AdministratorUserRefusal from '#features/administrator/_shared.user-refusal'
import AdministratorUserPresenter from '#features/administrator/users/users.presenter'
import UserRepository from '#repositories/user/user.repository'

type Payload = IdentifierPayload
type Response = Either<HTTPException, AdministratorUserShowResponse>

/** One account for the administrator. An unknown or archived id is an honest `404`. */
@inject()
export default class AdministratorUserShowUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const record = await this.users.findRecord(id)

      if (!record) return left(AdministratorUserRefusal.notFound())

      return right(AdministratorUserPresenter.show(record))
    } catch (error) {
      logger.error({ err: error }, '[administrator/users > show][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.ADMINISTRATOR_USER_SHOW_ERROR'),
          'ADMINISTRATOR_USER_SHOW_ERROR',
        ),
      )
    }
  }
}
