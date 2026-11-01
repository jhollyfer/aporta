import { expect, test } from './support/test'

test.describe('guia da cidade', () => {
  test('quando se troca de aba, a categoria vai para a URL e os eventos mostram a data', async ({
    page,
    expectHydrated,
  }) => {
    await page.goto('/guide')
    await expectHydrated(page.getByRole('link', { name: 'Eventos' }))

    await page.getByRole('link', { name: 'Eventos' }).click()

    await expect(page).toHaveURL(/category=EVENT/)
    await expect(
      page.getByRole('heading', { name: 'Festival dos Bois-Bumbás' }),
    ).toBeVisible()
    await expect(page.locator('main time').first()).toBeVisible()
  })

  test('quando a categoria da URL é inválida, abre a primeira aba', async ({
    page,
  }) => {
    await page.goto('/guide?category=nada')

    await expect(page.getByRole('link', { name: 'Comer' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  test('quando o lugar tem WhatsApp, o botão leva o nome dele', async ({
    page,
  }) => {
    await page.goto('/guide?category=EAT')

    const link = page.getByRole('link', { name: 'Falar no WhatsApp' }).first()

    await expect(link).toHaveAttribute('href', /^https:\/\/wa\.me\/\d+\?text=/)
  })
})
