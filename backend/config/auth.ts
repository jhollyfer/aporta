import { defineConfig } from '@adonisjs/auth'
import type {
  InferAuthenticators,
  InferAuthEvents,
  Authenticators,
} from '@adonisjs/auth/types'

import { CookieAccessTokensGuard } from '#guards/cookie-access-tokens.guard'

const authConfig = defineConfig({
  /**
   * Default guard used when no guard is explicitly specified.
   */
  default: 'api',

  guards: {
    /**
     * The API session, carried in an `httpOnly` cookie. It reuses Adonis's native
     * machinery of opaque access tokens and swaps the
     * transport: no `Authorization` header.
     */
    api: CookieAccessTokensGuard.provider(),
  },
})

export default authConfig

/**
 * Inferring types from the configured auth
 * guards.
 */
declare module '@adonisjs/auth/types' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type -- declaration merging requires `interface`, which adds no members here
  export interface Authenticators extends InferAuthenticators<
    typeof authConfig
  > {}
}
declare module '@adonisjs/core/types' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type -- declaration merging requires `interface`, which adds no members here
  interface EventsList extends InferAuthEvents<Authenticators> {}
}
