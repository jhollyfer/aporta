import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/cors'

import env from '#start/env'

/**
 * Configuration options to tweak the CORS policy. The following
 * options are documented on the official documentation website.
 *
 * https://docs.adonisjs.com/guides/security/cors
 */

/**
 * The allowlist comes from `CORS_ORIGINS`, comma-separated. Exported because
 * `origin.middleware` blocks cross-origin writes using the same list: a single
 * home for the rule.
 *
 * It must be explicit: with `credentials: true` below, the protocol refuses
 * `*` - the browser does not send a cookie to a wildcard origin. So either the frontend
 * origin is listed, or there is no session between the two.
 */
export const ALLOWED_ORIGINS: ReadonlyArray<string> = (
  env.get('CORS_ORIGINS') ?? ''
)
  .split(',')
  .map((allowed) => allowed.trim())
  .filter(Boolean)

/**
 * In development it allows any origin, so as not to require configuration from
 * whoever just wants to run front and back on their own machine.
 */
let origin: boolean | string[] = [...ALLOWED_ORIGINS]
if (app.inDev) origin = true

const corsConfig = defineConfig({
  /**
   * Enable or disable CORS handling globally.
   */
  enabled: true,

  origin,

  /**
   * HTTP methods accepted for cross-origin requests.
   */
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],

  /**
   * The headers the preflight allows, and not `true`.
   *
   * `true` reflects back whatever the browser asked for. The explicit list is what
   * makes a new header come in by decision and not by accident.
   *
   * `content-type` and `accept` are the minimum of any JSON request;
   * `x-request-id` is what the log correlates.
   */
  headers: ['content-type', 'accept', 'x-request-id'],

  /**
   * Response headers exposed to the browser.
   *
   * `content-disposition` is not among the simple response headers, so
   * without this line the page JavaScript reads `null` when looking for it - even with the
   * API sending the header, and even in development. It is how the
   * file download finds out the name to save.
   */
  exposeHeaders: ['content-disposition'],

  /**
   * Allow cookies/authorization headers on cross-origin requests.
   */
  credentials: true,

  /**
   * Cache CORS preflight response for N seconds.
   */
  maxAge: 90,
})

export default corsConfig
