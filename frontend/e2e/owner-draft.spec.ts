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

    // O rascunho grava depois de uma pausa e junta os dois campos: espera os dois no que foi
    // gravado, e não só o primeiro, senão o reload corre na frente do segundo salvamento.
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem('aporta:listing-draft:v1'),
        ),
      )
      .toMatch(
        /"type":"ROOM".*"furnished":true|"furnished":true.*"type":"ROOM"/,
      )

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

  test('quando um visitante sem sessão finaliza o cadastro, vai para a entrada e o rascunho continua salvo', async ({
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
    await page.getByRole('button', { name: 'Finalizar cadastro' }).click()

    // Sem sessão não há anúncio a criar: a entrada leva de volta ao cadastro depois do login.
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Flist-your-place$/)
    expect(
      await page.evaluate(() =>
        window.localStorage.getItem('aporta:listing-draft:v1'),
      ),
    ).toContain('Kitnet perto do porto')
  })

  test('quando o passo de fotos recebe um arquivo que não é imagem, avisa e não o lista', async ({
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
    await page.getByLabel('Escolher fotos').setInputFiles({
      name: 'nota.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('não sou uma foto'),
    })

    await expect(page.getByRole('alert')).toContainText('Só imagens')
    await expect(page.getByText('0 de 12 fotos escolhidas')).toBeVisible()

    // Uma imagem de verdade entra com prévia e o ambiente sugerido (a fachada vem primeiro).
    await page.getByLabel('Escolher fotos').setInputFiles({
      name: 'fachada.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    })

    await expect(page.getByText('1 de 12 fotos escolhidas')).toBeVisible()
    await expect(page.getByLabel('O que a foto mostra')).toHaveValue('FACADE')
    await page.getByRole('button', { name: 'Remover fachada.png' }).click()
    await expect(page.getByText('0 de 12 fotos escolhidas')).toBeVisible()
  })
})
