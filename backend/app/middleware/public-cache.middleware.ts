import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * How long a shared cache or a browser may reuse a public read without asking again, and how long
 * it may serve a stale copy while it revalidates in the background.
 *
 * **The ceiling is the signed photo URL.** The catalog and the detail carry `photos[].url`, signed
 * with `URL_TTL` (`config/drive.ts`, 15 minutes). A copy served at the very end of its stale
 * window is `MAX_AGE + STALE_WHILE_REVALIDATE` seconds old and still has to hold URLs that work:
 * 60 + 300 = 360 s, well under 900 s. Raising either number past that line would serve a page of
 * broken photos with no error anywhere, so `public-cache.middleware.unit.spec.ts` fails the day
 * the sum reaches `URL_TTL`.
 */
export const PUBLIC_CACHE = {
  MAX_AGE: 60,
  STALE_WHILE_REVALIDATE: 300,
} as const

/**
 * Marks a successful public read as cacheable (`Cache-Control: public`).
 *
 * Only for the `/storefront` reads, whose body is the same for every visitor: the group has no
 * session, and the presenter cuts every column that depends on who asks. Never on `/owner`,
 * `/administrator`, `/account` or `/authentication` - `public` there would let a shared cache
 * keep one person's data and hand it to the next.
 *
 * Only `200`. An error answered with `max-age` would keep a transient `500` or a `429` alive for
 * a minute after the cause is gone; and the exceptions never come back through here anyway,
 * because the handler renders them after the chain unwinds. The check is the second guard.
 */
export default class PublicCacheMiddleware {
  async handle(context: HttpContext, next: NextFn): Promise<unknown> {
    const output: unknown = await next()

    if (context.response.getStatus() === 200) {
      context.response.header(
        'Cache-Control',
        `public, max-age=${PUBLIC_CACHE.MAX_AGE}, stale-while-revalidate=${PUBLIC_CACHE.STALE_WHILE_REVALIDATE}`,
      )
    }

    return output
  }
}
