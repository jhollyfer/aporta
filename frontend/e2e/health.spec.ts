import { E2eEnv } from './support/env'
import { expect, test } from './support/test'

/**
 * O sinal de vida dos dois lados (`_standards/architecture.md` §7): `200`, `no-store` e o corpo
 * `{"status":"ok"}`. O smoke test do deploy e o healthcheck do Coolify batem nesta mesma rota.
 */
const TARGETS = [
  ['o app', E2eEnv.baseUrl],
  ['a API', E2eEnv.apiUrl],
] as const

for (const [name, origin] of TARGETS) {
  test(`quando se pede o /health-check de ${name}, responde ok sem cache`, async ({
    request,
  }) => {
    const response = await request.get(`${origin}/health-check`)

    expect(response.status()).toBe(200)
    expect(response.headers()['cache-control']).toContain('no-store')
    expect(await response.json()).toEqual({ status: 'ok' })
  })
}
