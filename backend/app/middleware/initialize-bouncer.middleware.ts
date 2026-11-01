import { Bouncer } from '@adonisjs/bouncer'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Actor } from '@aporta/shared'

import * as abilities from '#abilities/main'
import { policies } from '#generated/policies'

/**
 * Init bouncer middleware is used to create a bouncer instance
 * during an HTTP request
 */
export default class InitializeBouncerMiddleware {
  async handle(ctx: HttpContext, next: NextFn): Promise<unknown> {
    /**
     * Create bouncer instance for the ongoing HTTP request.
     * Bouncer reads the `actor` from the context, and not the model: resolution is
     * lazy, so `middleware.auth()` (which runs afterwards) has already built it
     * when the first check happens (`_standards/backend.md` §4.6).
     */
    ctx.bouncer = new Bouncer(
      () => ctx.actor,
      abilities,
      policies,
    ).setContainerResolver(ctx.containerResolver)

    return await next()
  }
}

declare module '@adonisjs/core/http' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- declaration merging requires `interface`
  export interface HttpContext {
    bouncer: Bouncer<Actor, typeof abilities, typeof policies>
  }
}
