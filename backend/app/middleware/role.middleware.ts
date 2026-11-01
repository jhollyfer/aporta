import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { UserRole } from '@aporta/shared'

import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'

/**
 * Refuses whoever reaches a module whose role is not theirs.
 *
 * Applied on the route **group**: a new endpoint is born protected by the module
 * it was placed in, without depending on someone remembering to annotate it. The exception is
 * each content resource's `DELETE`, which carries `role(['ADMINISTRATOR'])` on its
 * own endpoint because the group lets the editor through (archiving and restoring
 * are theirs; deleting for good is not). `start/routes.ts` explains the design.
 *
 * Always runs after `middleware.auth()`. The order matters: without a session the requester's
 * role is unknown, so the correct response is `401`, and it is `auth`
 * that returns it. The `403` here only makes sense once it is known who is
 * calling - unlike the data scope, which answers "not found" so as
 * not to confirm the resource exists.
 */
export default class RoleMiddleware {
  async handle(
    context: HttpContext,
    next: NextFn,
    roles: ReadonlyArray<UserRole>,
  ): Promise<unknown> {
    const user = context.auth.user

    // `schema.ts` is generated from the database and types `role` as `string`. Widening the list
    // to `readonly string[]` is a safe assignment - comparing with `as UserRole`
    // would be lying to the compiler about a value that comes from the database.
    const allowed: readonly string[] = roles

    if (!user || !allowed.includes(user.role)) {
      throw HTTPException.Forbidden(
        Translation.t('errors.ACCESS_DENIED'),
        'ACCESS_DENIED',
      )
    }

    return await next()
  }
}
