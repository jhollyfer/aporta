import { HttpContextFactory } from '@adonisjs/core/factories/http'
import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'

import { COOKIE_TOKEN } from '#config/session-token'
import { CookieAccessTokensGuard } from '#guards/cookie-access-tokens.guard'
import SessionTokenMemoryRepository from '#repositories/session-token/session-token.memory.repository'
import UserMemoryRepository from '#repositories/user/user.memory.repository'

/**
 * The session cookies the guard writes: the pair goes out `httpOnly`, and the sign-out deletes
 * with the SAME attributes as issuance - without them the browser creates a second cookie and
 * the domain one survives the logout.
 */
function subject() {
  const context = new HttpContextFactory().create()
  const guard = new CookieAccessTokensGuard(
    context,
    new SessionTokenMemoryRepository(),
    new UserMemoryRepository(),
  )

  return { context, guard }
}

function setCookies(context: HttpContext): string[] {
  const header = context.response.getHeader('set-cookie')
  if (Array.isArray(header)) return header.map(String)
  if (typeof header === 'string') return [header]

  return []
}

test.group('guards > cookie-access-tokens > cookies (unit)', () => {
  test('when it issues the session, writes the access and refresh cookies as httpOnly', ({
    assert,
  }) => {
    const { context, guard } = subject()

    guard.issueCookies({ accessToken: 'acesso', refreshToken: 'renovacao' })

    const cookies = setCookies(context)
    assert.lengthOf(cookies, 2)
    assert.isTrue(
      cookies.some((cookie) => cookie.startsWith(`${COOKIE_TOKEN.ACCESS}=`)),
    )
    assert.isTrue(
      cookies.some((cookie) => cookie.startsWith(`${COOKIE_TOKEN.REFRESH}=`)),
    )
    for (const cookie of cookies) assert.include(cookie, 'HttpOnly')
  })

  test('when it clears the session, expires both cookies with the same path', ({
    assert,
  }) => {
    const { context, guard } = subject()

    guard.clearCookies()

    const cookies = setCookies(context)
    assert.lengthOf(cookies, 2)
    for (const cookie of cookies) {
      assert.include(cookie, 'Path=/')
      assert.include(cookie, 'Max-Age=0')
    }
  })

  test('when the request has no refresh cookie, there is no refresh token to read', ({
    assert,
  }) => {
    const { guard } = subject()

    assert.isUndefined(guard.refreshToken())
  })
})
