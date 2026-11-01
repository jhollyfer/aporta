import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import type { NextFn } from '@adonisjs/core/types/http'

import { ALLOWED_ORIGINS } from '#config/cors'
import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'

/**
 * The methods that do not change state: the browser sends them without `Origin` in
 * ordinary navigation and nothing there writes. Everything else goes through the barrier.
 */
const SAFE_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * The CSRF barrier on every write.
 *
 * There is no CSRF token, and it is not forgetfulness: `application/json` forces the
 * browser to preflight, and the preflight hits the origin allowlist. But that
 * protection is **emergent** and has a hole: `multipart/form-data`,
 * `application/x-www-form-urlencoded` and `text/plain` go through without a preflight, and a
 * `fetch` with no body or `Content-Type` too. The session cookie travels along
 * (with `sameSite: 'none'`, or from a sibling subdomain), which is exactly the
 * condition of a CSRF. `config/shield.ts` has `csrf.enabled: false`, so nothing
 * else covered this case.
 *
 * That is why the barrier does not look at `Content-Type`: it holds for every method that is not
 * `GET`, `HEAD` or `OPTIONS`. It decides by `Origin`, which the browser **always**
 * sends on a cross-origin write and which the page cannot forge.
 * Without `Origin`, `Sec-Fetch-Site: cross-site` (a header the page also
 * cannot write) reveals a write from another site; with neither it is a client
 * that is not a browser (Postman, mobile, server-side) and stays allowed - the same
 * decision that CORS's `origin` already makes.
 * https://developer.mozilla.org/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site
 *
 * In development it refuses nothing, for the same reason `config/cors.ts`
 * allows any origin there: not requiring configuration from whoever just wants to run
 * front and back on their own machine.
 */
export default class OriginMiddleware {
  async handle(context: HttpContext, next: NextFn): Promise<unknown> {
    if (app.inDev) return await next()

    if (SAFE_METHODS.has(context.request.method())) return await next()

    const origin = context.request.header('origin')

    if (origin) {
      if (ALLOWED_ORIGINS.includes(origin)) return await next()

      throw HTTPException.Forbidden(
        Translation.t('errors.ORIGIN_NOT_ALLOWED'),
        'ORIGIN_NOT_ALLOWED',
      )
    }

    if (context.request.header('sec-fetch-site') === 'cross-site') {
      throw HTTPException.Forbidden(
        Translation.t('errors.ORIGIN_NOT_ALLOWED'),
        'ORIGIN_NOT_ALLOWED',
      )
    }

    return await next()
  }
}
