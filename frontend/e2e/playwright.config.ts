import { defineConfig, devices } from '@playwright/test'

import { E2eEnv } from './support/env'

/**
 * O executor do E2E (`_standards/tooling.md` §7, _doc-lib/playwright.md#docs/test-configuration).
 *
 * O endereço vem do ambiente e não tem default aqui: sem `E2E_BASE_URL` e `E2E_API_URL`,
 * `support/env.ts` para a execução dizendo qual falta (`docs/ENV.md`).
 *
 * Os dois servidores sobem por `webServer`; com `reuseExistingServer` fora do CI, o
 * `pnpm dev` e o `node ace serve` que já estão no ar são reaproveitados
 * (_doc-lib/playwright.md#docs/test-webserver).
 *
 * Roda de `frontend/` (`playwright test --config e2e/playwright.config.ts`): o `cwd` dos
 * servidores é relativo a esta pasta e a essa raiz.
 */
export default defineConfig({
  // A config mora em `e2e/` (`_standards/architecture.md` §4): o diretório dos specs é o
  // próprio, e a saída fica na raiz do app, onde o CI a lê.
  testDir: '.',
  outputDir: '../test-results',
  forbidOnly: Boolean(process.env['CI']),
  // Sem retry: teste instável é bug com tarefa, não intermitência aceita
  // (_doc-lib/playwright.md#docs/test-retries).
  retries: 0,
  // O teto da execução inteira; sem ele o job morto não gera relatório
  // (_doc-lib/playwright.md#docs/test-timeouts).
  globalTimeout: 15 * 60 * 1000,
  expect: { timeout: 15_000 },
  reporter: [['html', { open: 'never', outputFolder: '../playwright-report' }]],
  use: {
    baseURL: E2eEnv.baseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath: E2eEnv.chromiumPath },
  },
  projects: [
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node ace serve',
      cwd: '../../backend',
      // O boot valida `start/env.ts` e o CI não tem `.env`. O Playwright junta este `env` ao
      // `process.env`, então o resto vem do passo do workflow.
      env: { NODE_ENV: 'development' },
      url: 'http://localhost:3333/health-check',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
    {
      command: 'node .output/server/index.mjs',
      // O `cwd` padrão é a pasta da config (`e2e/`); o `.output/` mora na raiz do app.
      cwd: '..',
      // O Nitro escuta no `PORT` do ambiente, e no job de E2E ele é 3333, a porta do
      // backend: sem isto o segundo servidor cai em EADDRINUSE.
      env: { PORT: '3000' },
      url: 'http://localhost:3000/health-check',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
  ],
})
