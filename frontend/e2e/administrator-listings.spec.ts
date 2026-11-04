import { E2eEnv } from './support/env'
import { E2eListing } from './support/listing'
import { administratorTest as test, expect } from './support/test'

/**
 * A exclusão definitiva de um anúncio arquivado: só o administrador a vê e a faz. O dono cria o
 * anúncio, o administrador o arquiva pela tela, o moderador abre o mesmo anúncio e não encontra
 * o botão, e o administrador exclui de vez, o que apaga o anúncio (a API passa a responder 404
 * e a fila não o lista mais).
 *
 * Serial: os testes seguem o mesmo anúncio.
 */
const TITLE = `Kitnet da exclusão ${Date.now()}`

let listingId = ''

test.describe('exclusão definitiva de anúncio arquivado', () => {
  test.describe.configure({ mode: 'serial' })

  test('quando o anúncio está em análise, o administrador só vê Arquivar, e não Excluir de vez', async ({
    page,
    ownerPage,
  }) => {
    listingId = await E2eListing.create(ownerPage.request, TITLE)

    await page.goto(`/administrator/listings/${listingId}`)

    await expect(
      page.getByRole('heading', { level: 1, name: TITLE }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Arquivar', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Excluir de vez' }),
    ).toHaveCount(0)
  })

  test('quando o administrador arquiva pela tela, o anúncio sai da vitrine e aparece Excluir de vez', async ({
    page,
    expectHydrated,
  }) => {
    await page.goto(`/administrator/listings/${listingId}`)

    const archive = page.getByRole('button', { name: 'Arquivar', exact: true })
    await expectHydrated(archive)
    await archive.click()

    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText(`Arquivar "${TITLE}"?`)
    await dialog.getByRole('button', { name: 'Arquivar anúncio' }).click()

    await expect(
      page.getByRole('button', { name: 'Excluir de vez' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Arquivar', exact: true }),
    ).toHaveCount(0)
  })

  test('quando o moderador abre o anúncio arquivado, vê o estado e nenhum botão de excluir de vez', async ({
    moderatorPage,
  }) => {
    await moderatorPage.goto(`/administrator/listings/${listingId}`)

    await expect(
      moderatorPage.getByRole('heading', { level: 1, name: TITLE }),
    ).toBeVisible()
    await expect(moderatorPage.getByText('Arquivado').first()).toBeVisible()
    await expect(
      moderatorPage.getByRole('button', { name: 'Excluir de vez' }),
    ).toHaveCount(0)

    // E a API recusa a quem a tela escondeu o botão.
    const response = await moderatorPage.request.delete(
      `${E2eEnv.apiUrl}/administrator/listings/${listingId}/permanent`,
    )
    expect(response.status()).toBe(403)
  })

  test('quando o administrador exclui de vez e confirma, volta à fila e o anúncio deixa de existir', async ({
    page,
    expectHydrated,
  }) => {
    await page.goto(`/administrator/listings/${listingId}`)

    const remove = page.getByRole('button', { name: 'Excluir de vez' })
    await expectHydrated(remove)
    await remove.click()

    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText(`Excluir "${TITLE}" de vez?`)
    await dialog.getByRole('button', { name: 'Manter arquivado' }).click()
    await expect(dialog).toBeHidden()

    await page.getByRole('button', { name: 'Excluir de vez' }).click()
    await dialog.getByRole('button', { name: 'Excluir anúncio de vez' }).click()

    await expect(page).toHaveURL(/\/administrator\/listings(\?|$)/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Anúncios' }),
    ).toBeVisible()

    const gone = await page.request.get(
      `${E2eEnv.apiUrl}/administrator/listings/${listingId}`,
    )
    expect(gone.status()).toBe(404)
  })
})
