import app from '@adonisjs/core/services/app'

import SameSite from '#core/same-site'
import env from '#start/env'

/**
 * Session names and lifetimes, in one place.
 *
 * Each token's `name` is not decoration: it is what the guard checks to refuse
 * a refresh token presented as an access token. Both come from the same
 * `DbAccessTokensProvider` and are indistinguishable without it. It lives in `config/`
 * because the repository that issues the token and the guard that reads and writes the cookie
 * need the same value and none imports the other.
 */
export const COOKIE_TOKEN = {
  DRIVER_NAME: 'cookie-access-tokens',
  ACCESS: 'access-token',
  REFRESH: 'refresh-token',
  ACCESS_EXPIRY: '1d',
  REFRESH_EXPIRY: '7d',
} as const

/** The attributes that identify the session cookie, without the lifetime. */
type SessionCookieAttributes = {
  readonly httpOnly: true
  readonly secure: boolean
  readonly sameSite: 'lax' | 'none'
  readonly path: '/'
  domain?: string
}

/**
 * The first origin of `CORS_ORIGINS`, which is the client address.
 *
 * The first and not the whole list because `SameSite.between` answers per pair, and the
 * cookie attribute is a single one. Whoever serves more than one front on different sites
 * is in the case where `none` is mandatory anyway.
 */
const [firstOrigin] = (env.get('CORS_ORIGINS') ?? '').split(',')

let sameSite: 'lax' | 'none' = 'lax'
if (app.inProduction)
  sameSite = SameSite.between(
    firstOrigin?.trim() || undefined,
    env.get('APP_SERVER_URL'),
  ).value

const attributes: SessionCookieAttributes = {
  httpOnly: true,
  secure: app.inProduction,
  sameSite,
  path: '/',
}

// The `domain` key does not exist when there is no value. An explicit `domain: undefined`
// reaches some proxies as the string "undefined" in the `Set-Cookie`, and then the browser
// discards the cookie. Absent, the cookie is host-only and vanishes in the frontend SSR, which
// runs on another host.
const domain = env.get('COOKIE_DOMAIN')
if (domain) attributes.domain = domain

/**
 * Matching `name` + `domain` + `path` is what deletes a cookie, so issuing and clearing read
 * the same attributes from here.
 */
export const SESSION_COOKIE: Readonly<SessionCookieAttributes> = attributes
