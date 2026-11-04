import { E2eEnv } from './support/env'
import { E2eListing } from './support/listing'
import { E2eUploadFiles } from './support/upload-file'
import { expect, ownerTest as test } from './support/test'

/**
 * As fotos do anúncio na edição do dono: enviar, reordenar, remover, e a recusa do que não é foto
 * ou passa de 10 MB, que o navegador faz antes de qualquer envio (`use-photo-drafts.ts`).
 *
 * O envio vai de verdade ao bucket (`STORAGE_ENDPOINT` do backend sob teste), pelas URLs
 * assinadas: sem bucket o primeiro teste reprova com a causa. O anúncio nasce por API, sem foto,
 * e cada teste do bloco serial segue o mesmo anúncio.
 */
const TITLE = `Kitnet das fotos ${Date.now()}`
const TEN_MB = 10 * 1024 * 1024

let listingId = ''

test.describe('fotos do anúncio na edição', () => {
  test.describe.configure({ mode: 'serial' })

  test('quando o dono escolhe um arquivo que não é imagem ou passa de 10 MB, a tela recusa e nada entra na lista', async ({
    page,
    expectHydrated,
  }) => {
    listingId = await E2eListing.create(page.request, TITLE)

    await page.goto(`/owner/listings/${listingId}`)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Editar anúncio' }),
    ).toBeVisible()

    const chooser = page.getByLabel('Escolher fotos')
    await expectHydrated(chooser)

    await chooser.setInputFiles(E2eUploadFiles.text('recibo.txt'))
    await expect(
      page.getByText('Só imagens JPEG, PNG ou WebP', { exact: false }),
    ).toBeVisible()

    await chooser.setInputFiles(
      E2eUploadFiles.oversized('gigante.png', TEN_MB + 1),
    )
    await expect(
      page.getByText('Cada foto pode ter até 10 MB', { exact: false }),
    ).toBeVisible()

    await expect(page.locator('[data-slot="photo-row"]')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Enviar fotos' }),
    ).toBeDisabled()
  })

  test('quando o dono envia três fotos, elas entram na galeria na ordem escolhida e a primeira é a capa', async ({
    page,
    expectHydrated,
  }) => {
    await page.goto(`/owner/listings/${listingId}`)

    const chooser = page.getByLabel('Escolher fotos')
    await expectHydrated(chooser)
    await chooser.setInputFiles([
      E2eUploadFiles.png('a-fachada.png'),
      E2eUploadFiles.png('b-quarto.png'),
      E2eUploadFiles.png('c-banheiro.png'),
    ])
    await expect(page.locator('[data-slot="photo-row"]')).toHaveCount(3)

    await page.getByRole('button', { name: 'Enviar fotos' }).click()

    await expect(page.locator('[data-slot="owner-photo"]')).toHaveCount(3)
    await expect(
      page.locator('[data-slot="owner-photo"]').first(),
    ).toContainText('Foto 1 de 3')
    await expect(
      page.locator('[data-slot="owner-photo"]').first(),
    ).toContainText('Capa')
  })

  test('quando o dono desce a primeira foto, a ordem muda no servidor e a capa passa para a outra', async ({
    page,
  }) => {
    await page.goto(`/owner/listings/${listingId}`)

    const photos = page.locator('[data-slot="owner-photo"]')
    await expect(photos).toHaveCount(3)
    // A URL é assinada de novo a cada leitura: o que identifica a foto é o objeto, antes do `?`.
    const before = (
      (await photos.nth(0).locator('img').getAttribute('src')) ?? ''
    ).split('?')[0]

    await page.getByRole('button', { name: /^Descer a foto 1 /i }).click()

    await expect(
      page.getByText('Foto movida para a posição 2 de 3.'),
    ).toBeVisible()
    await expect
      .poll(() => photos.nth(1).locator('img').getAttribute('src'))
      .toContain(before)
    await expect(photos.first()).toContainText('Capa')

    // O servidor é a fonte da ordem: recarregar não a desfaz.
    await page.reload()
    await expect(photos).toHaveCount(3)
    await expect
      .poll(() => photos.nth(1).locator('img').getAttribute('src'))
      .toContain(before)
  })

  test('quando o dono sobe a última foto, ela vai para a posição anterior', async ({
    page,
  }) => {
    await page.goto(`/owner/listings/${listingId}`)

    const photos = page.locator('[data-slot="owner-photo"]')
    await expect(photos).toHaveCount(3)
    await expect(
      page.getByRole('button', { name: /^Descer a foto 3 /i }),
    ).toBeDisabled()

    await page.getByRole('button', { name: /^Subir a foto 3 /i }).click()

    await expect(
      page.getByText('Foto movida para a posição 2 de 3.'),
    ).toBeVisible()
  })

  test('quando o dono remove uma foto e confirma, ela sai e as outras sobem; "Manter foto" não remove nada', async ({
    page,
  }) => {
    await page.goto(`/owner/listings/${listingId}`)

    const photos = page.locator('[data-slot="owner-photo"]')
    await expect(photos).toHaveCount(3)

    await page.getByRole('button', { name: /^Remover a foto 1 /i }).click()

    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText('Remover esta foto?')
    await dialog.getByRole('button', { name: 'Manter foto' }).click()
    await expect(dialog).toBeHidden()
    await expect(photos).toHaveCount(3)

    await page.getByRole('button', { name: /^Remover a foto 1 /i }).click()
    await dialog.getByRole('button', { name: 'Remover foto' }).click()

    await expect(page.getByText('Foto removida.')).toBeVisible()
    await expect(photos).toHaveCount(2)
    await expect(photos.first()).toContainText('Foto 1 de 2')
    await expect(photos.first()).toContainText('Capa')

    // O mesmo no servidor: a API do dono devolve duas fotos.
    const response = await page.request.get(
      `${E2eEnv.apiUrl}/owner/listings/${listingId}`,
    )
    const body: unknown = await response.json()
    expect(body).toMatchObject({ photos: [{}, {}] })
  })
})
