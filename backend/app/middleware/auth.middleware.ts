import type { Authenticators } from '@adonisjs/auth/types'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { ActorSchema, type Actor } from '@aporta/shared'

/**
 * Authenticates the request and denies access to whoever has no session (`401`).
 *
 * After the guard, it validates the account against `ActorSchema` and leaves it in
 * `ctx.actor`: it is what the controller passes to the use-case and what Bouncer reads,
 * in place of Lucid's `User` (`_standards/backend.md` §4.3).
 */
export default class AuthMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {},
  ): Promise<unknown> {
    await ctx.auth.authenticateUsing(options.guards)

    // Fields come out one by one: Lucid keeps columns in `$attributes`, and the
    // schema reads only own properties. The `actor` carries what the rules read,
    // never the whole row (the password included).
    const { id, email, role, avatarId } = ctx.auth.getUserOrFail()

    ctx.actor = ActorSchema.parse({ id, email, role, avatarId })

    return await next()
  }
}

declare module '@adonisjs/core/http' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- declaration merging requires `interface`
  export interface HttpContext {
    /** Who acts: built by `middleware.auth()`, exists on every authenticated route. */
    actor: Actor
  }
}
