import { expect, test } from './support/test'

test.describe('busca e filtros', () => {
  test('quando se busca um tipo na home, a listagem chega filtrada, com chip e contagem', async ({
    page,
    expectHydrated,
  }) => {
    await page.goto('/')
    await expectHydrated(page.getByRole('button', { name: 'Buscar' }))

    await page.getByLabel('Tipo').first().selectOption('KITNET')
    await page.getByRole('button', { name: 'Buscar' }).click()

    await expect(page).toHaveURL(/\/listings\?.*type=KITNET/)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Imóveis em Benjamin Constant',
      }),
    ).toBeVisible()

    const cards = page.locator('main ul li a[href^="/listings/"]')
    const count = await cards.count()

    expect(count).toBeGreaterThan(0)
    // A contagem do botão é a do resultado: o visitante lê "Mostrar N imóveis" e vê N cards.
    await expect(
      page.getByRole('button', { name: `Mostrar ${count} imóveis` }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Remover filtro Kitnet' }),
    ).toBeVisible()
  })

  test('quando se remove o chip, o filtro some da URL e a lista cresce', async ({
    page,
    expectHydrated,
  }) => {
    await page.goto('/listings?type=KITNET')
    await expectHydrated(
      page.getByRole('button', { name: 'Remover filtro Kitnet' }),
    )

    const cards = page.locator('main ul li a[href^="/listings/"]')
    const filtered = await cards.count()

    await page.getByRole('button', { name: 'Remover filtro Kitnet' }).click()

    await expect(page).not.toHaveURL(/type=/)
    await expect.poll(() => cards.count()).toBeGreaterThan(filtered)
  })

  test('quando o endereço traz um filtro inválido, a página abre sem filtro', async ({
    page,
  }) => {
    const response = await page.goto('/listings?type=castelo&min=-5')

    expect(response?.status()).toBe(200)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Imóveis em Benjamin Constant',
      }),
    ).toBeVisible()
    await expect(
      page.getByRole('list', { name: 'Filtros aplicados' }),
    ).toHaveCount(0)
  })

  test('quando o filtro não deixa nenhum imóvel, mostra a saída para limpar', async ({
    page,
  }) => {
    await page.goto('/listings?type=HOTEL&neighborhood=umariacu-2')

    await expect(
      page.getByRole('heading', { name: 'Nenhum imóvel com esses filtros' }),
    ).toBeVisible()
  })
})
