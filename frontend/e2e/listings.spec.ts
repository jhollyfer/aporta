import { E2eEnv } from './support/env'
import { E2eMap } from './support/map'
import { expect, staffTest as test } from './support/test'

/**
 * A listagem paginada e o mapa por janela, contra o catálogo real. O seeder deixa 12 anúncios
 * no ar, que cabem numa página: o fixture `crowdedCatalog` publica mais um (pela API, com dono
 * e equipe) e arquiva no fim, para o catálogo voltar a 12 e o `health.spec.ts` continuar certo.
 *
 * O visitante é a própria `page` (que entra como equipe, e a vitrine pública não pede sessão).
 */
const CARDS = 'main ul li a[href^="/listings/"]'
const PER_PAGE = 12

function range(from: number, to: number, total: number): string {
  return `Mostrando ${from} a ${to} de ${total} imóveis`
}

test.describe('paginação da listagem', () => {
  test('quando há mais de uma página, a lista mostra a contagem, os 12 cards e a navegação', async ({
    page,
    crowdedCatalog,
  }) => {
    const { total } = crowdedCatalog
    const lastPage = Math.ceil(total / PER_PAGE)

    await page.goto('/listings')

    await expect(page.getByText(range(1, PER_PAGE, total))).toBeVisible()
    await expect(page.locator(CARDS)).toHaveCount(PER_PAGE)
    await expect(
      page.getByRole('navigation', { name: 'Paginação' }),
    ).toBeVisible()
    await expect(page.getByText(`Página 1 de ${lastPage}`)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Anterior' })).toBeDisabled()
  })

  test('quando se vai para a próxima, a página entra na URL, o foco vai para a contagem e o "voltar" volta', async ({
    page,
    expectHydrated,
    crowdedCatalog,
  }) => {
    const { total } = crowdedCatalog
    const last = Math.min(PER_PAGE * 2, total)

    await page.goto('/listings')
    await expectHydrated(page.getByRole('button', { name: 'Próxima' }))
    await page.getByRole('button', { name: 'Próxima' }).click()

    await expect(page).toHaveURL(/[?&]page=2/)
    const count = page.getByText(range(PER_PAGE + 1, last, total))

    await expect(count).toBeVisible()
    await expect(count).toBeFocused()
    await expect(page.locator(CARDS)).toHaveCount(last - PER_PAGE)

    await page.goBack()

    await expect(page).not.toHaveURL(/page=/)
    await expect(page.getByText(range(1, PER_PAGE, total))).toBeVisible()
  })

  test('quando se recarrega a página 2, o servidor já entrega a lista dela', async ({
    page,
    crowdedCatalog,
  }) => {
    const { total } = crowdedCatalog
    const html = await (
      await page.request.get(`${E2eEnv.baseUrl}/listings?page=2`)
    ).text()

    // O SSR vem do loader: sem JavaScript, o texto da página 2 já está no HTML.
    expect(html).toContain(
      range(PER_PAGE + 1, Math.min(PER_PAGE * 2, total), total),
    )

    await page.goto('/listings?page=2')
    await expect(
      page.getByText(range(PER_PAGE + 1, Math.min(PER_PAGE * 2, total), total)),
    ).toBeVisible()
    // Cada página é indexável por si: o canônico guarda o `page`, senão a 2 viraria cópia da 1.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${new URL(E2eEnv.baseUrl).origin}/listings?page=2`,
    )
    await expect(page).toHaveTitle(/Página 2 de \d+/)
  })

  test('quando o filtro muda estando na página 2, volta para a primeira', async ({
    page,
    expectHydrated,
    crowdedCatalog,
  }) => {
    void crowdedCatalog
    await page.goto('/listings?page=2')
    await expectHydrated(page.getByLabel('Tipo'))

    await page.getByLabel('Tipo').selectOption('HOUSE')

    await expect(page).toHaveURL(/type=HOUSE/)
    await expect(page).not.toHaveURL(/page=/)
    await expect(page.getByText(/^Mostrando 1 a /)).toBeVisible()
  })

  test('quando a página não existe mais, mostra a saída para a primeira', async ({
    page,
    expectHydrated,
    crowdedCatalog,
  }) => {
    void crowdedCatalog
    await page.goto('/listings?page=99')

    await expect(
      page.getByRole('heading', { name: 'Esta página não existe' }),
    ).toBeVisible()

    const first = page.getByRole('button', {
      name: 'Ir para a primeira página',
    })

    await expectHydrated(first)
    await first.click()

    await expect(page).not.toHaveURL(/page=99/)
    await expect(page.getByText(/^Mostrando 1 a /)).toBeVisible()
  })

  test('quando a URL pede 24 por página, os 13 cabem numa só e a navegação some', async ({
    page,
    crowdedCatalog,
  }) => {
    const { total } = crowdedCatalog

    await page.goto('/listings?perPage=24')

    await expect(page.getByText(range(1, total, total))).toBeVisible()
    await expect(page.locator(CARDS)).toHaveCount(total)
    await expect(
      page.getByRole('navigation', { name: 'Paginação' }),
    ).toHaveCount(0)
  })

  test('quando a URL pede um tamanho que não existe, usa 12', async ({
    page,
    crowdedCatalog,
  }) => {
    void crowdedCatalog
    await page.goto('/listings?perPage=100')

    await expect(page.locator(CARDS)).toHaveCount(PER_PAGE)
  })
})

const PINS_PATH = '/storefront/listings/pins'

test.describe('mapa por janela', () => {
  test('quando a listagem abre, o mapa pede os pins da janela visível com os filtros da URL', async ({
    page,
  }) => {
    const request = page.waitForRequest((item) =>
      item.url().includes(PINS_PATH),
    )

    await page.goto('/listings?type=KITNET')

    const params = new URL((await request).url()).searchParams

    for (const corner of ['minLng', 'minLat', 'maxLng', 'maxLat']) {
      expect(params.has(corner), corner).toBe(true)
    }
    expect(params.get('type')).toBe('KITNET')
    // O mapa não pagina: página e tamanho são da lista.
    expect(params.has('page')).toBe(false)
    expect(params.has('perPage')).toBe(false)

    await expect(E2eMap.firstPin(page)).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'OpenStreetMap' }),
    ).toBeVisible()
  })

  test('quando se tira o zoom, a janela cresce e o mapa pede de novo, sem recarregar a lista', async ({
    page,
    expectHydrated,
  }) => {
    const windows: Array<string | null> = []

    page.on('request', (item) => {
      if (item.url().includes(PINS_PATH)) {
        windows.push(new URL(item.url()).searchParams.get('minLng'))
      }
    })

    await page.goto('/listings')
    await expectHydrated(E2eMap.applyButton(page))
    await expect.poll(() => windows.length).toBeGreaterThan(0)

    const before = windows[0]

    await page.getByRole('button', { name: 'Zoom out' }).click()
    await page.getByRole('button', { name: 'Zoom out' }).click()

    await expect.poll(() => windows.at(-1)).not.toBe(before)
  })

  test('quando se toca num pin, a URL guarda a seleção e o resumo do imóvel aparece sobre o mapa', async ({
    page,
    expectHydrated,
  }) => {
    await page.goto('/listings')

    const pin = E2eMap.firstPin(page)

    await expect(pin).toBeVisible()
    await expectHydrated(E2eMap.applyButton(page))
    // `force`: pins de anúncios no mesmo bairro caem no mesmo ponto (o centro do bairro) e se
    // sobrepõem; o toque vai para o de cima, e qualquer um deles seleciona.
    await pin.click({ force: true })

    await expect(page).toHaveURL(/selected=/)

    const summary = page.getByRole('group', {
      name: 'Imóvel selecionado no mapa',
    })

    await expect(summary).toBeVisible()
    await expect(summary.getByRole('link')).toBeVisible()
  })

  test('quando o filtro não deixa nenhum imóvel, o mapa diz que a área está vazia', async ({
    page,
  }) => {
    await page.goto('/listings?type=HOTEL&neighborhood=umariacu-2')

    await expect(
      page.getByRole('status').filter({ hasText: 'Nenhum imóvel nesta área' }),
    ).toBeVisible()
  })

  test('quando a API limita os pedidos (429), o mapa diz quanto esperar e tenta de novo a pedido', async ({
    page,
    errors,
    expectHydrated,
  }) => {
    errors.allow(/429/)

    const pins = '**/storefront/listings/pins**'

    // `route.fulfill` troca a resposta inteira, então o CORS vai junto: sem ele o navegador
    // descartaria o 429 e a tela veria só "falha de rede".
    await page.route(pins, (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': new URL(E2eEnv.baseUrl).origin,
          'access-control-expose-headers': 'retry-after',
          'retry-after': '30',
        },
        body: JSON.stringify({
          message: 'Muitas requisições',
          status: 429,
          code: 'TOO_MANY_REQUESTS',
        }),
      }),
    )

    await page.goto('/listings')

    const alert = page.getByRole('alert').filter({ hasText: '30 s' })

    await expect(alert).toBeVisible()

    const retry = page.getByRole('button', { name: 'Tentar de novo' })

    await expectHydrated(retry)
    await page.unroute(pins)
    await retry.click()

    await expect(alert).toHaveCount(0)
    await expect(E2eMap.firstPin(page)).toBeVisible()
  })
})
