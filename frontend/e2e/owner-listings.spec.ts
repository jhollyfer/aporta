import type { Page } from '@playwright/test'

import { E2eEnv } from './support/env'
import { expect, ownerTest as test } from './support/test'

/**
 * O ciclo do anúncio do dono pela tela: cadastrar logado, ver em "Meus anúncios" em análise,
 * editar um campo e arquivar.
 *
 * **Sem foto, de propósito.** O ambiente do E2E não tem o MinIO que o envio por partes
 * assinadas precisa, então o caminho de subida dos arquivos (`/storages`, `PUT` direto no
 * bucket, ligação ao anúncio) fica sem E2E aqui: a escolha, a prévia e a remoção das fotos
 * são cobertas em `owner-draft.spec.ts`, e o envio, só no backend.
 *
 * Serial: os testes seguem o mesmo anúncio, do cadastro ao arquivamento.
 */
test.describe.configure({ mode: 'serial' })

const TITLE = `Kitnet E2E ${Date.now()}`
const NEW_TITLE = `${TITLE} editada`

/** Percorre as seis etapas até "Finalizar cadastro", sem tocar nele. */
async function fillListing(page: Page, title: string): Promise<void> {
  await page.getByLabel('Tipo de imóvel').selectOption('KITNET')
  await page.getByRole('button', { name: 'Continuar' }).click()

  await page.getByLabel('Bairro').selectOption('centro')
  await page.getByLabel('Rua e número').fill('Rua do Porto, 120')
  await page.getByRole('button', { name: 'Continuar' }).click()

  await page.getByLabel('Aluguel por mês, em reais').fill('900')
  await page.getByRole('checkbox', { name: 'Semestre' }).check()
  await page.getByLabel('Período mínimo, em meses').fill('4')
  await page.getByRole('button', { name: 'Continuar' }).click()

  await expect(page.getByText('Etapa 4 de 6')).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()

  await page.getByLabel('Título do anúncio').fill(title)
  await page
    .getByLabel('Descrição')
    .fill('Kitnet mobiliada, com cama, geladeira e fogão, perto do porto.')
  await page.getByRole('button', { name: 'Continuar' }).click()

  await page.getByLabel('Seu nome').fill('Seu Raimundo')
  await page.getByLabel('WhatsApp').fill('5597999990002')
}

test.describe('anúncios do dono', () => {
  test('quando o dono logado finaliza o cadastro, o anúncio vai para análise e aparece em Meus anúncios', async ({
    page,
    expectHydrated,
  }) => {
    await page.goto('/list-your-place')
    await expectHydrated(page.getByRole('button', { name: 'Continuar' }))
    await fillListing(page, TITLE)
    await page.getByRole('button', { name: 'Finalizar cadastro' }).click()

    await expect(
      page.getByRole('heading', { name: 'Anúncio enviado para análise' }),
    ).toBeVisible()
    await expect(page.getByText('Em análise', { exact: true })).toBeVisible()
    // O anúncio existe no servidor: o rascunho do aparelho não pode oferecer outro cadastro.
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem('aporta:listing-draft:v1'),
        ),
      )
      .toBeNull()

    await page.getByRole('link', { name: 'Ver meus anúncios' }).click()

    await expect(page).toHaveURL(/\/owner\/listings$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Meus anúncios' }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: TITLE })).toBeVisible()
    // A conta do worker pode ter outros anúncios (a acessibilidade cria os dela): o chip é o desta linha.
    await expect(
      page
        .getByRole('listitem')
        .filter({ hasText: TITLE })
        .getByText('Em análise', { exact: true }),
    ).toBeVisible()
  })

  test('quando o dono está logado, o cabeçalho e a conta levam a Meus anúncios', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Meus anúncios' })
      .click()
    await expect(page).toHaveURL(/\/owner\/listings$/)

    await page.goto('/account')
    await expect(
      page.getByRole('link', { name: 'Meus anúncios' }),
    ).toBeVisible()
  })

  test('quando o dono edita o título, o valor novo aparece na lista', async ({
    page,
  }) => {
    await page.goto('/owner/listings')
    await page.getByRole('link', { name: `Editar ${TITLE}` }).click()

    await expect(
      page.getByRole('heading', { level: 1, name: 'Editar anúncio' }),
    ).toBeVisible()
    await page.getByLabel('Título do anúncio').fill(NEW_TITLE)
    await page.getByRole('button', { name: 'Salvar alterações' }).click()

    await expect(page.getByText('Alterações salvas.')).toBeVisible()

    await page.getByRole('link', { name: 'Meus anúncios' }).first().click()
    await expect(page.getByRole('heading', { name: NEW_TITLE })).toBeVisible()
  })

  test('quando o dono deixa o endereço curto demais e salva, o erro aparece no campo e nada é salvo', async ({
    page,
  }) => {
    await page.goto('/owner/listings')
    await page.getByRole('link', { name: `Editar ${NEW_TITLE}` }).click()

    await page.getByLabel('Rua e número').fill('Rua')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByText('Alterações salvas.')).toHaveCount(0)
  })

  test('quando o dono arquiva o anúncio, a confirmação nomeia o anúncio e ele some da lista', async ({
    page,
  }) => {
    await page.goto('/owner/listings')
    await page.getByRole('button', { name: `Arquivar ${NEW_TITLE}` }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText(`Arquivar "${NEW_TITLE}"?`)

    // Manter não muda nada.
    await dialog.getByRole('button', { name: 'Manter anúncio' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('heading', { name: NEW_TITLE })).toBeVisible()

    await page.getByRole('button', { name: `Arquivar ${NEW_TITLE}` }).click()
    await page.getByRole('button', { name: 'Arquivar anúncio' }).click()

    await expect(page.getByRole('heading', { name: NEW_TITLE })).toHaveCount(0)
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('quando o servidor recusa o bairro, a mensagem vai para o campo e a etapa certa volta', async ({
    page,
    errors,
    expectHydrated,
  }) => {
    // O 422 simulado é a resposta esperada, e o navegador a registra no console.
    errors.allow(/status of 422/)

    await page.route('**/owner/listings', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback()
        return
      }

      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        // A resposta simulada responde ao pedido entre origens: sem estes cabeçalhos o
        // navegador a descarta como falha de CORS e o app veria "rede fora do ar".
        headers: {
          'access-control-allow-origin': new URL(E2eEnv.baseUrl).origin,
          'access-control-allow-credentials': 'true',
        },
        body: JSON.stringify({
          message: 'x',
          status: 422,
          code: 'NEIGHBORHOOD_NOT_FOUND',
          errors: { neighborhood: 'x' },
        }),
      })
    })

    await page.goto('/list-your-place')
    await expectHydrated(page.getByRole('button', { name: 'Continuar' }))
    await fillListing(page, `${TITLE} recusado`)
    await page.getByRole('button', { name: 'Finalizar cadastro' }).click()

    await expect(page.getByText('Etapa 2 de 6')).toBeVisible()
    await expect(page.getByRole('alert')).toHaveText(
      'Esse bairro não está na lista da cidade. Escolha outro.',
    )
  })
})
