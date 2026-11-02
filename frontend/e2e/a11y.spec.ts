import type { APIRequestContext } from '@playwright/test'

import { E2eListing } from './support/listing'
import { E2eMap } from './support/map'
import { expect, ownerTest, staffTest, test } from './support/test'

/**
 * Toda página pública abre, mostra o título principal e não tem violação séria de
 * acessibilidade, nos dois temas (`_standards/frontend.md` §11.2). O tema vem da preferência do
 * sistema (`prefers-color-scheme`), por isso o teste troca o `colorScheme` do contexto.
 */
const PAGES = [
  '/',
  '/listings',
  '/listings?view=map',
  '/listings/kitnet-centro-porto',
  '/guide',
  '/list-your-place',
  '/sign-in',
  '/sign-up',
] as const

/** `:id` vira o anúncio criado para o teste; as outras entram como estão. */
const OWNER_PAGES = [
  '/account',
  '/owner/listings',
  '/owner/listings/:id',
] as const

/** As telas da equipe; `:id` vira um anúncio criado pelo dono, que a equipe abre. */
const STAFF_PAGES = [
  '/administrator/listings',
  '/administrator/reports',
  '/administrator/listings/:id',
] as const

const SCHEMES = ['light', 'dark'] as const

async function staffPath(
  request: APIRequestContext,
  path: (typeof STAFF_PAGES)[number],
): Promise<string> {
  if (!path.includes(':id')) return path

  const id = await E2eListing.create(request, 'Kitnet para a revisão')

  return path.replace(':id', id)
}

async function ownerPath(
  request: APIRequestContext,
  path: (typeof OWNER_PAGES)[number],
): Promise<string> {
  if (!path.includes(':id')) return path

  const id = await E2eListing.create(request, 'Kitnet para a acessibilidade')

  return path.replace(':id', id)
}

for (const scheme of SCHEMES) {
  test.describe(`tema ${scheme}`, () => {
    test.use({ colorScheme: scheme })

    for (const path of PAGES) {
      test(`quando se abre ${path}, mostra o título e não tem violação séria`, async ({
        page,
        expectNoBlockingViolations,
      }) => {
        const response = await page.goto(path)

        expect(response?.status()).toBe(200)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expectNoBlockingViolations()
      })
    }

    // As telas do dono pedem sessão: o navegador abre já autenticado (`ownerTest`), e o
    // anúncio do segundo caminho é criado pela API, porque o que se mede aqui é a tela.
    for (const path of OWNER_PAGES) {
      ownerTest(
        `quando o dono abre ${path}, mostra o título e não tem violação séria`,
        async ({ page, expectNoBlockingViolations }) => {
          const resolved = await ownerPath(page.request, path)

          await page.goto(resolved)
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
          await expectNoBlockingViolations()
        },
      )
    }

    // A equipe entra como a moderadora do seeder; o anúncio do detalhe é do dono, criado pela API.
    for (const path of STAFF_PAGES) {
      staffTest(
        `quando a equipe abre ${path}, mostra o título e não tem violação séria`,
        async ({ page, ownerPage, expectNoBlockingViolations }) => {
          await page.goto(await staffPath(ownerPage.request, path))
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
          await expectNoBlockingViolations()
        },
      )
    }

    // O diálogo é a parte da tela que só existe aberta: o `<dialog>` modal precisa passar no axe também.
    staffTest(
      'quando a equipe abre o diálogo de recusa, não há violação séria',
      async ({
        page,
        ownerPage,
        expectNoBlockingViolations,
        expectHydrated,
      }) => {
        const id = await E2eListing.create(
          ownerPage.request,
          'Kitnet do diálogo',
        )

        await page.goto(`/administrator/listings/${id}`)
        const refuse = page.getByRole('button', {
          name: 'Recusar',
          exact: true,
        })
        await expectHydrated(refuse)
        await refuse.click()
        await expect(page.getByRole('dialog')).toBeVisible()
        await expectNoBlockingViolations()
      },
    )

    // A segunda página e o resumo do pin só existem com a vitrine paginada e o mapa carregado:
    // são estados novos da listagem e passam pelo axe como qualquer tela.
    staffTest(
      'quando a listagem está na página 2, mostra o título e não tem violação séria',
      async ({ page, crowdedCatalog, expectNoBlockingViolations }) => {
        void crowdedCatalog
        await page.goto('/listings?page=2')

        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expect(
          page.getByRole('navigation', { name: 'Paginação' }),
        ).toBeVisible()
        await expectNoBlockingViolations()
      },
    )

    staffTest(
      'quando o visitante toca num pin, o resumo sobre o mapa não tem violação séria',
      async ({ page, expectHydrated, expectNoBlockingViolations }) => {
        await page.goto('/listings')

        const pin = E2eMap.firstPin(page)

        await expect(pin).toBeVisible()
        await expectHydrated(E2eMap.applyButton(page))
        await pin.click({ force: true })
        await expect(
          page.getByRole('group', { name: 'Imóvel selecionado no mapa' }),
        ).toBeVisible()
        await expectNoBlockingViolations()
      },
    )

    test('quando o visitante abre o diálogo de denúncia, não há violação séria', async ({
      page,
      expectNoBlockingViolations,
      expectHydrated,
    }) => {
      await page.goto('/listings/kitnet-centro-porto')
      const open = page.getByRole('button', { name: 'Denunciar este anúncio' })
      await expectHydrated(open)
      await open.click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expectNoBlockingViolations()
    })
  })
}

test.describe('tela de 320 px e movimento reduzido', () => {
  test.use({ reducedMotion: 'reduce', viewport: { width: 320, height: 640 } })

  for (const path of PAGES) {
    test(`quando se abre ${path}, não há rolagem horizontal`, async ({
      page,
    }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        )
        .toBe(true)
    })
  }
})

test.describe('listagem paginada e mapa em 320 px', () => {
  test.use({ reducedMotion: 'reduce', viewport: { width: 320, height: 640 } })

  staffTest(
    'quando a listagem está na página 2, não há rolagem horizontal e a navegação cabe',
    async ({ page, crowdedCatalog }) => {
      void crowdedCatalog
      await page.goto('/listings?page=2')

      const nav = page.getByRole('navigation', { name: 'Paginação' })

      await expect(nav).toBeVisible()
      await expect(nav.getByRole('button', { name: 'Próxima' })).toBeVisible()
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        )
        .toBe(true)
    },
  )

  staffTest(
    'quando o mapa abre e um pin é tocado, o resumo cabe na tela sem rolagem horizontal',
    async ({ page, expectHydrated }) => {
      await page.goto('/listings?view=map')

      const pin = E2eMap.firstPin(page)

      await expect(pin).toBeVisible()
      await expectHydrated(E2eMap.applyButton(page))
      await pin.click({ force: true })
      await expect(
        page.getByRole('group', { name: 'Imóvel selecionado no mapa' }),
      ).toBeVisible()
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        )
        .toBe(true)
    },
  )
})

test.describe('telas do dono em 320 px', () => {
  test.use({ reducedMotion: 'reduce', viewport: { width: 320, height: 640 } })

  for (const path of OWNER_PAGES) {
    ownerTest(
      `quando o dono abre ${path}, não há rolagem horizontal`,
      async ({ page }) => {
        await page.goto(await ownerPath(page.request, path))
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

        await expect
          .poll(() =>
            page.evaluate(
              () =>
                document.documentElement.scrollWidth <=
                document.documentElement.clientWidth,
            ),
          )
          .toBe(true)
      },
    )
  }
})

test.describe('telas da equipe em 320 px', () => {
  test.use({ reducedMotion: 'reduce', viewport: { width: 320, height: 640 } })

  for (const path of STAFF_PAGES) {
    staffTest(
      `quando a equipe abre ${path}, não há rolagem horizontal`,
      async ({ page, ownerPage }) => {
        await page.goto(await staffPath(ownerPage.request, path))
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

        await expect
          .poll(() =>
            page.evaluate(
              () =>
                document.documentElement.scrollWidth <=
                document.documentElement.clientWidth,
            ),
          )
          .toBe(true)
      },
    )
  }
})
