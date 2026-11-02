import type { Page } from '@playwright/test'

import { expect, test } from './support/test'

/** O total do resultado, lido de "Mostrando 1 a 12 de 25 imóveis": os cards são só a página. */
async function listedTotal(page: Page): Promise<number> {
  const text = await page
    .getByText(/^Mostrando \d+ a \d+ de \d+ imóveis$/)
    .innerText()
  const total = /de (\d+) imóveis$/.exec(text)?.[1]

  return Number(total)
}

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

    const total = await listedTotal(page)

    expect(total).toBeGreaterThan(0)
    // A contagem do botão é a do resultado inteiro, e não a dos cards da página: o visitante lê
    // "Mostrar N imóveis" e "Mostrando 1 a X de N", e os dois dizem o mesmo N.
    await expect(
      page.getByRole('button', { name: `Mostrar ${total} imóveis` }),
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

    const filtered = await listedTotal(page)

    await page.getByRole('button', { name: 'Remover filtro Kitnet' }).click()

    await expect(page).not.toHaveURL(/type=/)
    await expect.poll(() => listedTotal(page)).toBeGreaterThan(filtered)
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
