import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AccountProfileShowResponse,
  type Actor,
  type Either,
} from '@aporta/shared'

import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import ProfilePresenter from '#features/account/profile/profile.presenter'
import UserRepository from '#repositories/user/user.repository'
import StorageContract from '#services/storage/storage.contract'

/** Who asks: the session account (`_standards/backend.md` §4.3). */
type Payload = { readonly actor: Actor }
type Response = Either<HTTPException, AccountProfileShowResponse>

/**
 * Reading the account itself, by the session `actor` `id`: the guard already
 * resolved it with the session filters (an archived or inactive account does not even get
 * here), and the repository returns the row with the photo, which is part of the resource.
 */
@inject()
export default class AccountProfileShowUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly storage: StorageContract,
  ) {}

  async execute({ actor }: Payload): Promise<Response> {
    try {
      const record = await this.users.findRecord(actor.id)

      // The guard just read this live account; vanishing mid-request is an
      // unexpected failure, the same as before, and not a new `404`.
      if (!record) return left(this.failure())

      return right(
        ProfilePresenter.show(
          record,
          await this.storage.signFile(record.avatar),
        ),
      )
    } catch (error) {
      logger.error({ err: error }, '[account/profile > show][error]')

      return left(this.failure())
    }
  }

  private failure(): HTTPException {
    return HTTPException.InternalServerError(
      Translation.t('errors.ACCOUNT_PROFILE_SHOW_ERROR'),
      'ACCOUNT_PROFILE_SHOW_ERROR',
    )
  }
}
