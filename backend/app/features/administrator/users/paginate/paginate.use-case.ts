import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorUserPaginateResponse,
  type Either,
} from '@aporta/shared'

import { PAGINATION } from '#core/response'
import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import AdministratorUserPresenter from '#features/administrator/users/users.presenter'
import UserRepository from '#repositories/user/user.repository'
import type { AdministratorUserPaginatePayload } from '#validators/administrator/users.validator'

type Payload = AdministratorUserPaginatePayload
type Response = Either<HTTPException, AdministratorUserPaginateResponse>

/**
 * The accounts list for the administrator: by role, status and a search over name and email, the
 * newest first unless a column is asked. Who may read it was decided by the route (`ADMINISTRATOR`).
 */
@inject()
export default class AdministratorUserPaginateUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const page = await this.users.paginate({
        page: payload.page ?? PAGINATION.PAGE,
        perPage: payload.perPage ?? PAGINATION.PER_PAGE,
        search: payload.search,
        role: payload.role,
        status: payload.status,
        sort: payload.sort ?? 'createdAt',
        direction: payload.direction ?? 'desc',
      })

      return right({
        meta: page.meta,
        data: page.data.map((record) =>
          AdministratorUserPresenter.show(record),
        ),
      })
    } catch (error) {
      logger.error({ err: error }, '[administrator/users > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.ADMINISTRATOR_USER_PAGINATE_ERROR'),
          'ADMINISTRATOR_USER_PAGINATE_ERROR',
        ),
      )
    }
  }
}
