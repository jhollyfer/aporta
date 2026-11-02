import AxeBuilder from '@axe-core/playwright'
import { test as base, expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import type { E2eSession } from './account'
import { E2eEnv } from './env'
import { E2eListing } from './listing'
import { E2eSessionFiles } from './session-files'

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
      // O interior de iframe de terceiro (vídeo, player) tem marcação que não é nossa: fica de
      // fora, e o próprio `<iframe>` (título, tamanho) continua checado (DECISIONS #268).
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude({ fromFrames: ['iframe', 'body'] })
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
 * As duas contas, lidas dos arquivos que o projeto `setup` gravou (`auth.setup.ts`): o login
 * acontece uma vez por execução, e não por worker nem por projeto de viewport, para não gastar
 * o limite de entrada da API (5 por minuto por IP).
 */
const withSessions = test.extend<object, Sessions>({
  owner: [
    // eslint-disable-next-line no-empty-pattern -- o Playwright exige desestruturação no 1º argumento do fixture
    async ({}, provide) => {
      await provide(await E2eSessionFiles.read(E2eSessionFiles.owner))
    },
    { scope: 'worker' },
  ],
  staff: [
    // eslint-disable-next-line no-empty-pattern -- o Playwright exige desestruturação no 1º argumento do fixture
    async ({}, provide) => {
      await provide(await E2eSessionFiles.read(E2eSessionFiles.staff))
    },
    { scope: 'worker' },
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
  /**
   * A vitrine com mais de uma página: o teste começa com `CROWDED_CATALOG` anúncios no ar e o
   * que foi criado é arquivado no fim, para o catálogo voltar aos 12 do seeder.
   */
  crowdedCatalog: { total: number }
}

/** Um a mais que a página de 12: o suficiente para existir "Próxima". */
const CROWDED_CATALOG = 13

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
  crowdedCatalog: async ({ page, ownerPage }, provide) => {
    const created = await E2eListing.crowd(
      ownerPage.request,
      page.request,
      CROWDED_CATALOG,
    )

    try {
      await provide({ total: await E2eListing.publishedTotal(page.request) })
    } finally {
      for (const id of created) await E2eListing.archive(page.request, id)
    }
  },
})

export { expect }
