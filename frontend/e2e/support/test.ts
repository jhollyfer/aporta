import AxeBuilder from '@axe-core/playwright'
import { test as base, expect } from '@playwright/test'
import type { Locator } from '@playwright/test'

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

export { expect }
