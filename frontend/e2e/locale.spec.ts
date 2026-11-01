import { expect, test } from './support/test'

test.describe('idiomas', () => {
  const CASES = [
    ['/en', 'Find a place to live in Benjamin Constant', 'en'],
    ['/es', 'Encuentre dónde vivir en Benjamin Constant', 'es'],
    ['/', 'Ache onde morar em Benjamin Constant', 'pt-BR'],
  ] as const

  for (const [path, title, lang] of CASES) {
    test(`quando se abre ${path}, o título e o lang da página são ${lang}`, async ({
      page,
    }) => {
      await page.goto(path)

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
      await expect(page.locator('html')).toHaveAttribute('lang', lang)
    })
  }

  test('quando se abre o inglês, a página declara o hreflang dos três idiomas e o x-default', async ({
    page,
  }) => {
    await page.goto('/en/listings')

    const languages = await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((links) =>
        links.map((link) => link.getAttribute('hreflang')),
      )

    expect(languages).toEqual(
      expect.arrayContaining(['pt-BR', 'en', 'es', 'x-default']),
    )
  })
})
