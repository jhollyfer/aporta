import { expect, test } from './support/test'

/**
 * Toda página pública abre, mostra o título principal e não tem violação séria de
 * acessibilidade, nos dois temas (`_standards/frontend.md` §11.2). O tema vem da preferência do
 * sistema (`prefers-color-scheme`), por isso o teste troca o `colorScheme` do contexto.
 */
const PAGES = [
  '/',
  '/listings',
  '/listings/kitnet-centro-porto',
  '/guide',
  '/list-your-place',
  '/sign-in',
  '/sign-up',
] as const

const SCHEMES = ['light', 'dark'] as const

for (const scheme of SCHEMES) {
  test.describe(`tema ${scheme}`, () => {
    test.use({ colorScheme: scheme })

    for (const path of PAGES) {
      test(`quando se abre ${path}, mostra o título e não tem violação séria`, async ({
        page,
        expectNoBlockingViolations,
      }) => {
        const response = await page.goto(path)

        expect(response?.status()).toBe(200)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expectNoBlockingViolations()
      })
    }
  })
}

test.describe('tela de 320 px e movimento reduzido', () => {
  test.use({ reducedMotion: 'reduce', viewport: { width: 320, height: 640 } })

  for (const path of PAGES) {
    test(`quando se abre ${path}, não há rolagem horizontal`, async ({
      page,
    }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        )
        .toBe(true)
    })
  }
})
