import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { STAFF_USER_ROLES } from '@aporta/shared'

import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'

/**
 * The API reference only exists for whoever operates the installation.
 *
 * The document describes the **whole** surface: every route, every parameter, every
 * body shape and every error code. Publishing it without a session hands the complete map
 * to whoever has not yet signed in.
 *
 * **404 and not 403**: a 403 would confirm the route exists and that there is a role that reaches it. For
 * whoever cannot see it, it simply is not there.
 *
 * Depends on `SilentAuthMiddleware`, which already runs earlier in the router stack and
 * populates `auth.user` when there is a valid cookie without refusing whoever has none.
 */
export default class DocumentationMiddleware {
  async handle(context: HttpContext, next: NextFn): Promise<unknown> {
    const user = context.auth.user

    if (!user)
      throw HTTPException.NotFound(
        Translation.t('errors.RESOURCE_NOT_FOUND'),
        'RESOURCE_NOT_FOUND',
      )

    if (!STAFF_USER_ROLES.includes(user.role)) {
      throw HTTPException.NotFound(
        Translation.t('errors.RESOURCE_NOT_FOUND'),
        'RESOURCE_NOT_FOUND',
      )
    }

    return await next()
  }
}
