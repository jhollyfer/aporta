import { E2eEnv } from './support/env'
import { E2eListing } from './support/listing'
import { expect, ownerTest, staffTest as test } from './support/test'

/**
 * A moderação de ponta a ponta, com quatro papéis em contextos de navegador separados: o
 * dono cria o anúncio, a equipe recusa com motivo, o dono lê o motivo e reenvia editando, a
 * equipe aprova e verifica o dono, o visitante vê o anúncio na vitrine e o denuncia, e a
 * equipe resolve a denúncia.
 *
 * A equipe é o moderador que o seeder de demonstração cria (`moderator@example.com`), com a
 * senha de `SEED_DEMO_PASSWORD` (aqui, `E2E_DEMO_PASSWORD`). **Sem foto**, como em `owner-listings.spec.ts`: o ambiente do E2E
 * não tem o MinIO que o envio de arquivos exige.
 *
 * O limite da denúncia é de 5 por hora por IP: uma rodada gasta uma. Quem repete a rodada
 * várias vezes seguidas limpa `rate_limits` antes (`docs/TEST-PLAN.md`).
 *
 * Serial: os testes seguem o mesmo anúncio, da criação à denúncia resolvida.
 */
const TITLE = `Kitnet da moderação ${Date.now()}`
const REFUSAL = 'Faltam as fotos da cozinha e do banheiro.'
const REPORT_DETAILS = 'Pediram um adiantamento por transferência.'
const RESOLUTION = 'Anúncio conferido com o dono, sem indício de golpe.'

let listingId = ''
let publicPath = ''

test.describe('moderação de anúncios e denúncias', () => {
  test.describe.configure({ mode: 'serial' })

  test('quando o dono cria um anúncio, ele aparece na fila da equipe em análise', async ({
    page,
    ownerPage,
  }) => {
    listingId = await E2eListing.create(ownerPage.request, TITLE)

    await page.goto('/administrator/listings')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Anúncios' }),
    ).toBeVisible()
    // O padrão da fila é "Em análise"; a conta do worker pode ter outros anúncios, então se busca o desta rodada.
    await expect(
      page.getByRole('button', { name: 'Em análise', pressed: true }),
    ).toBeVisible()

    await page.getByLabel('Buscar por título ou descrição').fill(TITLE)
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()

    const row = page.getByRole('listitem').filter({ hasText: TITLE })
    await expect(row).toBeVisible()
    await expect(row.getByText('Em análise', { exact: true })).toBeVisible()
    await expect(page).toHaveURL(/q=/)
  })

  test('quando a equipe recusa com um motivo curto demais, o erro fica no campo e nada é recusado', async ({
    page,
    expectHydrated,
  }) => {
    await page.goto(`/administrator/listings/${listingId}`)
    await expect(
      page.getByRole('heading', { level: 1, name: TITLE }),
    ).toBeVisible()
    await expect(
      page.getByText('O dono ainda não enviou fotos.', { exact: false }),
    ).toBeVisible()

    const refuse = page.getByRole('button', { name: 'Recusar', exact: true })
    await expectHydrated(refuse)
    await refuse.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText(`Recusar "${TITLE}"?`)
    await dialog.getByLabel('Motivo da recusa').fill('ab')
    await dialog.getByRole('button', { name: 'Recusar anúncio' }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()
    await expect(dialog.getByLabel('Motivo da recusa')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await expect(dialog.getByText('2 de 500 caracteres')).toBeVisible()
  })

  test('quando a equipe recusa com motivo, o anúncio volta ao dono e a fila o mostra devolvido', async ({
    page,
  }) => {
    await page.goto(`/administrator/listings/${listingId}`)
    await page.getByRole('button', { name: 'Recusar', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Motivo da recusa').fill(REFUSAL)
    await dialog.getByRole('button', { name: 'Recusar anúncio' }).click()

    await expect(
      page.getByText('Anúncio recusado. O dono vê o motivo em Meus anúncios.'),
    ).toBeVisible()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Precisa de ajuste').first()).toBeVisible()
    // Recusar é da fila de análise: o anúncio devolvido não oferece mais os dois botões.
    await expect(
      page.getByRole('button', { name: 'Aprovar e publicar' }),
    ).toHaveCount(0)
  })

  test('quando o dono abre Meus anúncios, vê o motivo da recusa e reenvia editando', async ({
    ownerPage,
  }) => {
    await ownerPage.goto('/owner/listings')

    const row = ownerPage.getByRole('listitem').filter({ hasText: TITLE })
    await expect(row.getByText('Precisa de ajuste')).toBeVisible()
    await expect(row.getByText(REFUSAL)).toBeVisible()

    await row.getByRole('link', { name: `Editar ${TITLE}` }).click()

    await expect(
      ownerPage.getByRole('heading', { level: 1, name: 'Editar anúncio' }),
    ).toBeVisible()
    await expect(ownerPage.getByText(REFUSAL)).toBeVisible()
    await expect(
      ownerPage.getByText('ao salvar, o anúncio volta para a análise', {
        exact: false,
      }),
    ).toBeVisible()

    await ownerPage
      .getByLabel('Descrição')
      .fill('Kitnet mobiliada, com cama, geladeira e fogão. Fotos em breve.')
    await ownerPage.getByRole('button', { name: 'Salvar alterações' }).click()

    await expect(
      ownerPage.getByText(
        'Alterações salvas. O anúncio voltou para a análise.',
      ),
    ).toBeVisible()
    // O aviso some junto com a recusa: a API a limpa quando o anúncio volta para a fila.
    await expect(ownerPage.getByText(REFUSAL)).toHaveCount(0)
    await expect(
      ownerPage.getByText('Em análise', { exact: true }),
    ).toBeVisible()
  })

  test('quando a equipe aprova e verifica o dono, o anúncio vai ao ar com o selo', async ({
    page,
  }) => {
    await page.goto(`/administrator/listings/${listingId}`)
    await expect(page.getByText('Em análise', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Verificar dono' }).click()
    await expect(
      page.getByText('Dono verificado. O selo já aparece nos anúncios dele.'),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Remover verificação' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Aprovar e publicar' }).click()
    await expect(
      page.getByText('Anúncio aprovado. Ele já aparece na vitrine.'),
    ).toBeVisible()

    const view = page.getByRole('link', { name: 'Ver no site' })
    await expect(view).toBeVisible()
    publicPath = (await view.getAttribute('href')) ?? ''
    expect(publicPath).toMatch(/\/listings\//)
  })

  test('quando o visitante abre a vitrine, o anúncio aprovado aparece com o selo do dono verificado', async ({
    visitorPage,
  }) => {
    await visitorPage.goto(publicPath)

    await expect(
      visitorPage.getByRole('heading', { level: 1, name: TITLE }),
    ).toBeVisible()
    await expect(visitorPage.getByText('Dono verificado')).toBeVisible()
  })

  test('quando o visitante denuncia sem escolher o motivo, o erro aparece e nada é enviado', async ({
    visitorPage,
    expectHydrated,
  }) => {
    await visitorPage.goto(publicPath)

    const open = visitorPage.getByRole('button', {
      name: 'Denunciar este anúncio',
    })
    await expectHydrated(open)
    await open.click()

    const dialog = visitorPage.getByRole('dialog')
    // A armadilha de robô existe, mas fora da tela, da leitura por voz e do Tab.
    await expect(dialog.locator('#website')).toHaveAttribute('tabindex', '-1')
    await expect(dialog.locator('#website')).not.toBeInViewport()

    await dialog.getByRole('button', { name: 'Enviar denúncia' }).click()

    await expect(dialog.getByText('Escolha um motivo.')).toBeVisible()
    await expect(dialog.getByText('Denúncia enviada')).toHaveCount(0)
  })

  test('quando a API limita as denúncias, a tela diz em minutos quando tentar de novo', async ({
    visitorPage,
    expectHydrated,
  }) => {
    await visitorPage.route('**/storefront/reports', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': new URL(E2eEnv.baseUrl).origin,
          'access-control-expose-headers': 'retry-after',
          'retry-after': '3600',
        },
        body: JSON.stringify({
          message: 'x',
          status: 429,
          code: 'TOO_MANY_REQUESTS',
        }),
      })
    })

    await visitorPage.goto(publicPath)
    const open = visitorPage.getByRole('button', {
      name: 'Denunciar este anúncio',
    })
    await expectHydrated(open)
    await open.click()

    const dialog = visitorPage.getByRole('dialog')
    await dialog.getByRole('radio', { name: 'Parece golpe' }).check()
    await dialog.getByRole('button', { name: 'Enviar denúncia' }).click()

    await expect(
      dialog.getByText('Muitas tentativas. Tente de novo em 60 min.'),
    ).toBeVisible()
    await visitorPage.unroute('**/storefront/reports')
  })

  test('quando o visitante denuncia o anúncio, vê o agradecimento sem ter conta', async ({
    visitorPage,
    expectHydrated,
  }) => {
    await visitorPage.goto(publicPath)

    const open = visitorPage.getByRole('button', {
      name: 'Denunciar este anúncio',
    })
    await expectHydrated(open)
    await open.click()

    const dialog = visitorPage.getByRole('dialog')
    await dialog.getByRole('radio', { name: 'Parece golpe' }).check()
    await dialog.getByLabel('Detalhes (opcional)').fill(REPORT_DETAILS)
    await dialog.getByRole('button', { name: 'Enviar denúncia' }).click()

    await expect(dialog.getByText('Denúncia enviada')).toBeVisible()
    await dialog.getByRole('button', { name: 'Fechar' }).click()
    await expect(dialog).toBeHidden()
  })

  test('quando a equipe abre as denúncias, vê a nova com o motivo e a resolve com uma nota', async ({
    page,
    expectHydrated,
  }) => {
    await page.goto('/administrator/reports')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Denúncias' }),
    ).toBeVisible()

    const row = page.getByRole('listitem').filter({ hasText: TITLE })
    await expect(row.getByText('Parece golpe')).toBeVisible()
    await expect(row.getByText(REPORT_DETAILS)).toBeVisible()
    await expect(
      row.getByRole('link', { name: new RegExp(TITLE) }),
    ).toHaveAttribute('href', `/administrator/listings/${listingId}`)

    const resolve = row.getByRole('button', { name: 'Resolver', exact: true })
    await expectHydrated(resolve)
    await resolve.click()

    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Nota da resolução').fill(RESOLUTION)
    await dialog
      .getByRole('button', { name: 'Resolver denúncia', exact: true })
      .click()

    await expect(page.getByText('Denúncia resolvida.')).toBeVisible()
    await expect(
      page.getByRole('listitem').filter({ hasText: TITLE }),
    ).toHaveCount(0)

    await page
      .getByRole('group', { name: 'Estado da denúncia' })
      .getByRole('button', { name: 'Resolvidas' })
      .click()
    const resolved = page.getByRole('listitem').filter({ hasText: TITLE })
    await expect(resolved.getByText(RESOLUTION)).toBeVisible()
  })

  test('quando a equipe arquiva o anúncio, ele sai da vitrine', async ({
    page,
    visitorPage,
  }) => {
    await page.goto(`/administrator/listings/${listingId}`)
    await page.getByRole('button', { name: 'Arquivar', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText(`Arquivar "${TITLE}"?`)
    await dialog.getByRole('button', { name: 'Arquivar anúncio' }).click()

    await expect(page.getByText('Anúncio arquivado.')).toBeVisible()

    const response = await visitorPage.goto(publicPath)
    expect(response?.status()).toBe(404)
  })
})

ownerTest.describe('quem anuncia não entra no painel', () => {
  ownerTest(
    'quando o dono abre /administrator, volta para a conta',
    async ({ page }) => {
      await page.goto('/administrator/listings')
      await expect(page).toHaveURL(/\/account$/)

      await page.goto('/administrator/reports')
      await expect(page).toHaveURL(/\/account$/)
    },
  )

  ownerTest(
    'quando o dono logado abre o cabeçalho, não há link Painel',
    async ({ page }) => {
      await page.goto('/')
      await expect(
        page
          .getByRole('navigation', { name: 'Navegação principal' })
          .getByRole('link', { name: 'Meus anúncios' }),
      ).toBeVisible()
      await expect(
        page
          .getByRole('navigation', { name: 'Navegação principal' })
          .getByRole('link', { name: 'Painel' }),
      ).toHaveCount(0)
    },
  )
})

test.describe('o painel na navegação da equipe', () => {
  test('quando a moderadora está logada, o cabeçalho e a conta levam ao Painel', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Painel' })
      .click()
    await expect(page).toHaveURL(/\/administrator\/listings$/)

    await page.goto('/account')
    await expect(page.getByRole('link', { name: 'Painel' })).toBeVisible()
  })
})
