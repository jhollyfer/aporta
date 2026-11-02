import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either, type UserRole } from '@aporta/shared'

import Translation from '#core/translation'
import User from '#domain/user/user.entity'
import HTTPException from '#exceptions/http.exception'
import UserRepository from '#repositories/user/user.repository'
import IdGeneratorContract from '#services/id-generator/id-generator.contract'

/** The roles this door creates. `OWNER` is never one of them: owners sign themselves up. */
export type StaffRole = Exclude<UserRole, 'OWNER'>

type Payload = {
  readonly name: string
  readonly email: string
  readonly password: string
  readonly role: StaffRole
}

type Created = {
  readonly id: string
  readonly email: string
  readonly role: StaffRole
}

type Response = Either<HTTPException, Created>

/**
 * Creates a staff account (`ADMINISTRATOR` or `MODERATOR`) from the terminal: `node ace
 * staff:create`. There is no HTTP door for it on purpose - no endpoint creates an account with
 * power without a session, and the seeder does not run in production, so the first administrator
 * of a new database needs a path that is not a route. The command validates the payload with the
 * sign-up validator (the one password policy of the project) before it gets here.
 *
 * It refuses an email that already exists, archived accounts included: promoting an existing
 * account would be a different operation, and quietly reusing an archived one would resurrect a
 * person the staff had removed. Only the id, email and role come back: the password never leaves
 * the use-case, so the command cannot print it by accident.
 */
@inject()
export default class AdministratorStaffCreateUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly ids: IdGeneratorContract,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const id = this.ids.next()

      if (await this.users.existsByEmail(payload.email, id))
        return left(this.conflict())

      const saved = await this.users.save(
        User.create({
          id,
          name: payload.name,
          email: payload.email,
          password: payload.password,
          role: payload.role,
        }),
      )

      if (saved.isLeft()) {
        const fact = saved.value

        if (fact.code === 'REPOSITORY_FAILURE')
          return left(this.failure(fact.cause))

        // The race the question above cannot close: two runs with the same email passing it
        // together, and the `UNIQUE` refusing the second.
        return left(this.conflict())
      }

      return right({
        id: saved.value.user.id,
        email: payload.email,
        role: payload.role,
      })
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
    logger.error({ err: cause }, '[administrator/staff > create][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.ADMINISTRATOR_STAFF_CREATE_ERROR'),
      'ADMINISTRATOR_STAFF_CREATE_ERROR',
    )
  }
}
