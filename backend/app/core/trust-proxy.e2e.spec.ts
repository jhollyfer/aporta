import db from '@adonisjs/lucid/services/db'
import { z } from '@aporta/shared'
import { test } from '@japa/runner'

import { http } from '#config/app'
import { resetDatabase } from '#tests/database-fixtures'

/**
 * Behind which proxy `X-Forwarded-For` holds (`TRUSTED_PROXIES`).
 *
 * The client IP is the key of the inbound limits, and the per-IP ceiling is where you
 * see what `request.ip()` returned: the sign-in counter lives in `rate_limits`
 * under `rlflx:signIn_ip_<ip>`. The test client connects from `127.0.0.1`, which is
 * the `loopback` - the default when `TRUSTED_PROXIES` is missing.
 */
const FORWARDED = '203.0.113.9'
const SOCKET = '127.0.0.1'

const Keys = z.array(z.object({ key: z.string() }))

async function signInKeys(): Promise<string[]> {
  const rows: unknown = await db.from('rate_limits').select('key')

  return Keys.parse(rows)
    .map(({ key }) => key)
    .filter((key) => key.includes('signIn_ip_'))
}

test.group('trustProxy > client IP', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the proxy is trusted, the limit counts the X-Forwarded-For IP', async ({
    client,
    assert,
  }) => {
    await client
      .post('/authentication/sign-in')
      .header('x-forwarded-for', FORWARDED)
      .json({ email: 'quem@exemplo.com', password: 'nao-importa' })

    assert.deepEqual(await signInKeys(), [`rlflx:signIn_ip_${FORWARDED}`])
  })

  test('when the proxy is untrusted, X-Forwarded-For is ignored', async ({
    client,
    assert,
    cleanup,
  }) => {
    // The server reads `trustProxy` from the same config object: swapping the list for
    // one that does not include the peer that connected is the same as a client talking
    // directly to the API, forging the header.
    const configured = http.trustProxy
    http.trustProxy = (address: string) => address.startsWith('10.')
    cleanup(() => {
      http.trustProxy = configured
    })

    await client
      .post('/authentication/sign-in')
      .header('x-forwarded-for', FORWARDED)
      .json({ email: 'quem@exemplo.com', password: 'nao-importa' })

    assert.deepEqual(await signInKeys(), [`rlflx:signIn_ip_${SOCKET}`])
  })
})
