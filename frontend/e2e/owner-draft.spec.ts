import { expect, test } from './support/test'

test.describe('cadastro do imóvel', () => {
  test('quando se avança sem escolher o tipo, o erro vem em português e a etapa não muda', async ({
    page,
    expectHydrated,
  }) => {
    await page.goto('/list-your-place')
    await expectHydrated(page.getByRole('button', { name: 'Continuar' }))

    await page.getByRole('button', { name: 'Continuar' }).click()

    await expect(page.getByRole('alert')).toHaveText('Informe o tipo do imóvel')
    await expect(page.getByText('Etapa 1 de 6')).toBeVisible()
  })

  test('quando se preenche a primeira etapa e a página recarrega, o rascunho volta', async ({
    page,
    expectHydrated,
  }) => {
    await page.goto('/list-your-place')
    await expectHydrated(page.getByRole('button', { name: 'Continuar' }))

    await page.getByLabel('Tipo de imóvel').selectOption('ROOM')
    await page.getByLabel('O imóvel é mobiliado').check()

    // O rascunho grava depois de uma pausa: espera a gravação em vez de dormir.
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem('aporta:listing-draft:v1'),
        ),
      )
      .toContain('"type":"ROOM"')

    await page.reload()

    await expect(page.getByLabel('Tipo de imóvel')).toHaveValue('ROOM')
    await expect(page.getByLabel('O imóvel é mobiliado')).toBeChecked()
  })

  test('quando o rascunho guardado está corrompido, o formulário abre vazio', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('aporta:listing-draft:v1', '{isto não é json')
    })
    await page.goto('/list-your-place')

    await expect(page.getByLabel('Tipo de imóvel')).toHaveValue('')
  })

  test('quando se completa o fluxo, o anúncio é recebido e o rascunho é apagado', async ({
    page,
    expectHydrated,
  }) => {
    await page.goto('/list-your-place')
    await expectHydrated(page.getByRole('button', { name: 'Continuar' }))

    await page.getByLabel('Tipo de imóvel').selectOption('KITNET')
    await page.getByRole('button', { name: 'Continuar' }).click()

    await page.getByLabel('Bairro').selectOption('centro')
    await page.getByLabel('Rua e número').fill('Rua do Porto, 120')
    await page.getByRole('button', { name: 'Continuar' }).click()

    await page.getByLabel('Aluguel por mês, em reais').fill('900')
    await page.getByLabel('Semestre').check()
    await page.getByLabel('Período mínimo, em meses').fill('4')
    await page.getByRole('button', { name: 'Continuar' }).click()

    await expect(page.getByText('Etapa 4 de 6')).toBeVisible()
    await page.getByRole('button', { name: 'Continuar' }).click()

    await page.getByLabel('Título do anúncio').fill('Kitnet perto do porto')
    await page
      .getByLabel('Descrição')
      .fill('Kitnet mobiliada, com cama, geladeira e fogão, perto do porto.')
    await page.getByRole('button', { name: 'Continuar' }).click()

    await page.getByLabel('Seu nome').fill('Seu Raimundo')
    await page.getByLabel('WhatsApp').fill('5597999990002')
    await page.getByRole('button', { name: 'Enviar anúncio' }).click()

    await expect(
      page.getByRole('heading', { name: 'Anúncio recebido' }),
    ).toBeVisible()
    expect(
      await page.evaluate(() =>
        window.localStorage.getItem('aporta:listing-draft:v1'),
      ),
    ).toBeNull()
  })
})
