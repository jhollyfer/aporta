import { expect, test } from './support/test'

test.describe('detalhe do imóvel', () => {
  test('quando se abre um anúncio, o WhatsApp leva o nome do imóvel e o número do dono', async ({
    page,
  }) => {
    await page.goto('/listings/kitnet-centro-porto')

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Kitnet mobiliada perto do porto',
      }),
    ).toBeVisible()
    await expect(page.getByText('Dono verificado').first()).toBeVisible()

    const link = page.getByRole('link', { name: 'Chamar no WhatsApp' }).first()
    const href = await link.getAttribute('href')

    expect(href).toMatch(/^https:\/\/wa\.me\/5597999990002\?text=/)
    expect(decodeURIComponent(href ?? '')).toContain(
      'Kitnet mobiliada perto do porto',
    )
    await expect(link).toHaveAttribute('rel', /noopener/)
  })

  test('quando se troca de ambiente na galeria, a aba fica selecionada', async ({
    page,
    expectHydrated,
  }) => {
    await page.goto('/listings/kitnet-centro-porto')
    await expectHydrated(page.getByRole('tab', { name: 'Banheiro' }))

    await page.getByRole('tab', { name: 'Banheiro' }).click()

    await expect(page.getByRole('tab', { name: 'Banheiro' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  test('quando o anúncio não existe, responde 404 dentro da casca do site', async ({
    page,
    errors,
  }) => {
    // O navegador registra no console o 404 do próprio documento: é o que o teste provoca.
    errors.allow(/status of 404/)

    const response = await page.goto('/listings/nao-existe')

    expect(response?.status()).toBe(404)
    await expect(
      page.getByRole('heading', { name: 'Esta página não existe' }),
    ).toBeVisible()
  })
})
