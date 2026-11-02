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

/**
 * A API pública de leitura, com o catálogo semeado (`backend/database/seeders`): o frontend
 * lê anúncio, bairro e guia dela, e um catálogo vazio faria todos os outros specs falharem
 * por um motivo que esta conferência diz de forma direta.
 */
test('quando se pede os anúncios da API, responde os 12 do catálogo semeado', async ({
  request,
}) => {
  const response = await request.get(`${E2eEnv.apiUrl}/storefront/listings`)

  expect(response.status()).toBe(200)

  const body = await response.json()

  expect(body.data).toHaveLength(12)
  expect(body.meta.total).toBe(12)
})
