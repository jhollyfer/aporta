import app from '@adonisjs/core/services/app'

import SameSite from '#core/same-site'
import env from '#start/env'

/**
 * Session names and lifetimes, in one place.
 *
 * Each token's `name` is not decoration: it is what the guard checks to refuse
 * a refresh token presented as an access token. Both come from the same
 * `DbAccessTokensProvider` and are indistinguishable without it.
 *
 * The `aporta-` prefix on the names is not decoration either: in production `COOKIE_DOMAIN` is
 * `.maiyu.com.br`, shared with other apps of the house that inherited the same mold, and two
 * cookies with the same name on the same domain overwrite each other - signing in to one
 * app would sign the other one out. The names are only written here. It lives in `config/`
 * because the repository that issues the token and the guard that reads and writes the cookie
 * need the same value and none imports the other.
 */
export const COOKIE_TOKEN = {
  DRIVER_NAME: 'cookie-access-tokens',
  ACCESS: 'aporta-access-token',
  REFRESH: 'aporta-refresh-token',
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
 * `lax` unless the deploy puts the app and the API on different sites, which is what
 * `APP_CLIENT_URL` declares: a missing configuration falls to `lax`, because `none` by mistake
 * sends the cookie on every request from another site (`_standards/backend.md` §4.10).
 */
let sameSite: 'lax' | 'none' = 'lax'
const clientUrl = env.get('APP_CLIENT_URL')
if (app.inProduction && clientUrl)
  sameSite = SameSite.between(clientUrl, env.get('APP_SERVER_URL')).value

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
