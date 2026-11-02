import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * `Referrer-Policy: no-referrer` on every response.
 *
 * `@adonisjs/shield` covers CSP, HSTS, `X-Frame-Options` and `nosniff` (`config/shield.ts`) but
 * has no option for this header, so it is set here, in the server stack, to also reach the
 * errors that are rendered before any route. The API answers JSON, which triggers no navigation,
 * so the header matters for the one HTML response there is: the Scalar page, which loads a script
 * from a CDN and would otherwise tell that CDN the address of the API documentation. Nothing the
 * Scalar page does depends on a referrer.
 */
export default class ReferrerPolicyMiddleware {
  async handle(context: HttpContext, next: NextFn): Promise<unknown> {
    context.response.header('Referrer-Policy', 'no-referrer')

    return await next()
  }
}
