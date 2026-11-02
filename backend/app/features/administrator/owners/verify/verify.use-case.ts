import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorOwnerVerifyResponse,
  type Either,
  type Merge,
} from '@aporta/shared'

import { WireDate } from '#core/response'
import Translation from '#core/translation'
import type { IdentifierPayload } from '#core/validator'
import type User from '#domain/user/user.entity'
import HTTPException from '#exceptions/http.exception'
import UserRepository from '#repositories/user/user.repository'
import ClockContract from '#services/clock/clock.contract'
import type { AdministratorOwnerVerifyPayload } from '#validators/administrator/owners.validator'

type Payload = Merge<AdministratorOwnerVerifyPayload, IdentifierPayload>
type Response = Either<HTTPException, AdministratorOwnerVerifyResponse>

/**
 * Marks or unmarks the seal on an owner's account. Who may was decided by the route group (the
 * staff roles); whether the account can carry it (only a live `OWNER`) is the entity's. Unmarking
 * needs no such check, so a seal that ended up on the wrong account can always be taken off.
 */
@inject()
export default class AdministratorOwnerVerifyUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly clock: ClockContract,
  ) {}

  async execute({ id, verified }: Payload): Promise<Response> {
    try {
      const user = await this.users.findById(id)

      if (!user)
        return left(
          HTTPException.NotFound(
            Translation.t('errors.USER_NOT_FOUND'),
            'USER_NOT_FOUND',
          ),
        )

      const changed = this.change(user, verified)

      if (changed.isLeft()) return left(changed.value)

      const saved = await this.users.save(user)

      if (saved.isLeft()) return left(this.failure(saved.value))

      const { verifiedAt } = saved.value.user.snapshot()

      return right({
        id,
        verified: verifiedAt !== null,
        verifiedAt: WireDate.isoOrNull(verifiedAt),
      })
    } catch (error) {
      return left(this.failure(error))
    }
  }

  private change(user: User, verified: boolean): Either<HTTPException, User> {
    if (!verified) return right(user.unverify())

    const result = user.verify(this.clock.now())

    if (result.isRight()) return right(result.value)

    return left(
      HTTPException.Conflict(
        Translation.t('errors.USER_NOT_VERIFIABLE'),
        'USER_NOT_VERIFIABLE',
      ),
    )
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[administrator/owners > verify][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.ADMINISTRATOR_OWNER_VERIFY_ERROR'),
      'ADMINISTRATOR_OWNER_VERIFY_ERROR',
    )
  }
}
