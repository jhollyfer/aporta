import AxeBuilder from '@axe-core/playwright'
import { test as base, expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import { E2eAccount } from './account'
import type { E2eSession } from './account'
import { E2eEnv } from './env'

type UnexpectedErrors = {
  /** Declara como esperado um erro de console que o teste provoca de propósito. */
  allow: (pattern: RegExp) => void
}

type Fixtures = {
  errors: UnexpectedErrors
  /** Reprova violação `serious` ou `critical` de acessibilidade na página (`frontend.md` §11.2). */
  expectNoBlockingViolations: () => Promise<void>
  /** Espera o React assumir o elemento: antes disso o clique cai no HTML cru do SSR. */
  expectHydrated: (locator: Locator) => Promise<void>
}

/**
 * O `test` da casa (_doc-lib/playwright.md#docs/test-fixtures).
 *
 * `errors` é automático: todo spec termina sem `pageerror` nem `console.error` que ele não tenha
 * declarado como esperado.
 */
export const test = base.extend<Fixtures>({
  errors: [
    async ({ page }, provide) => {
      const seen: Array<string> = []
      const allowed: Array<RegExp> = []

      page.on('pageerror', (error) => seen.push(`pageerror: ${error.message}`))

      // Só o console da própria origem (site e API): um recurso de terceiro que a rede do
      // executor não alcança (os ladrilhos do OpenStreetMap, por exemplo) registra um erro que
      // não é do app, e o status de uma resposta nossa continua sendo pego.
      const own = [E2eEnv.baseUrl, E2eEnv.apiUrl].map(
        (url) => new URL(url).origin,
      )

      page.on('console', (message) => {
        if (message.type() !== 'error') return

        const { url } = message.location()

        if (url && !own.some((origin) => url.startsWith(origin))) return

        seen.push(`console: ${message.text()}`)
      })

      await provide({ allow: (pattern) => void allowed.push(pattern) })

      const unexpected = seen.filter(
        (entry) => !allowed.some((pattern) => pattern.test(entry)),
      )

      expect(unexpected).toEqual([])
    },
    { auto: true },
  ],

  expectNoBlockingViolations: async ({ page }, provide) => {
    await provide(async () => {
      // A entrada `.enter` anima `opacity` por 0,7s mais o atraso escalonado: o axe lê a cor já
      // misturada com a opacidade do quadro em que a página estava, e acusa contraste em texto
      // que, parado, passa. Espera só as animações do relógio do documento; as do `view()`
      // andam com a rolagem e nunca terminam.
      await page.evaluate(() =>
        Promise.all(
          document
            .getAnimations()
            .filter(
              (animation) => animation.timeline instanceof DocumentTimeline,
            )
            .map((animation) => animation.finished),
        ),
      )

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      const blocking = results.violations.filter(
        (violation) =>
          violation.impact === 'serious' || violation.impact === 'critical',
      )

      // Só o essencial na mensagem de falha: regra, impacto e onde.
      expect(
        blocking.map(
          (violation) =>
            `${violation.impact} ${violation.id}: ${violation.nodes
              .map((node) => node.target.join(' '))
              .join(' | ')}`,
        ),
      ).toEqual([])
    })
  },

  // `__reactProps$…` é a marca que o React põe no nó que assumiu; a página não tem outro sinal
  // de hidratação, e o `networkidle` que a doc desaconselha não é um.
  // eslint-disable-next-line no-empty-pattern -- o Playwright exige desestruturação no 1º argumento do fixture
  expectHydrated: async ({}, provide) => {
    await provide(async (locator) => {
      await expect
        .poll(() =>
          locator.evaluate((element) =>
            Object.keys(element).some((key) => key.startsWith('__reactProps')),
          ),
        )
        .toBe(true)
    })
  },
})

type Sessions = { owner: E2eSession; staff: E2eSession }

/**
 * As duas contas do worker, criadas sob demanda e **uma vez por worker**, não por teste,
 * para não gastar o limite de entrada da API (5 por minuto por IP): o dono é cadastrado e
 * entra, a equipe é a moderadora do seeder.
 */
/**
 * Guardadas no módulo (que existe uma vez por processo de worker) e não só no fixture: o
 * Playwright monta de novo os fixtures de worker quando o teste seguinte vem de outro
 * `test` (`ownerTest`, `staffTest`, `test`), e cada montagem seria uma entrada a mais no
 * limite de 5 por minuto por IP.
 */
const sessions: { owner?: Promise<E2eSession>; staff?: Promise<E2eSession> } =
  {}

const withSessions = test.extend<object, Sessions>({
  owner: [
    async ({ playwright }, provide) => {
      sessions.owner ??= (async () => {
        const request = await playwright.request.newContext()
        const session = await E2eAccount.session(request)

        await request.dispose()

        return session
      })()

      await provide(await sessions.owner)
    },
    { scope: 'worker', timeout: 120_000 },
  ],
  staff: [
    async ({ playwright }, provide) => {
      sessions.staff ??= (async () => {
        const request = await playwright.request.newContext()
        const session = await E2eAccount.staffSession(request)

        await request.dispose()

        return session
      })()

      await provide(await sessions.staff)
    },
    { scope: 'worker', timeout: 120_000 },
  ],
})

/**
 * O `test` de quem já está logado como dono: o mesmo `test` da casa, com o navegador aberto
 * numa sessão.
 */
export const ownerTest = withSessions.extend<{
  storageState: E2eSession['storageState']
}>({
  storageState: async ({ owner }, provide) => {
    await provide(owner.storageState)
  },
})

type Actors = {
  storageState: E2eSession['storageState']
  /** A página do dono, em outro contexto: duas pessoas no mesmo teste sem trocar de conta. */
  ownerPage: Page
  /** A página de quem não entrou: o visitante da vitrine. */
  visitorPage: Page
}

/**
 * O `test` da equipe: `page` já entra como moderadora, e `ownerPage` e `visitorPage` são os
 * outros dois papéis do fluxo de moderação, cada um num contexto de navegador próprio.
 */
export const staffTest = withSessions.extend<Actors>({
  storageState: async ({ staff }, provide) => {
    await provide(staff.storageState)
  },
  ownerPage: async ({ browser, owner }, provide) => {
    const context = await browser.newContext({
      baseURL: E2eEnv.baseUrl,
      storageState: owner.storageState,
    })

    await provide(await context.newPage())
    await context.close()
  },
  visitorPage: async ({ browser }, provide) => {
    const context = await browser.newContext({ baseURL: E2eEnv.baseUrl })

    await provide(await context.newPage())
    await context.close()
  },
})

export { expect }
