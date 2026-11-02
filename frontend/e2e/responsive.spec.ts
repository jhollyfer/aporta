import type { Page } from '@playwright/test'

import { E2eScreens } from './support/screens'
import { expect, ownerTest, staffTest, test } from './support/test'

/**
 * Toda tela de cada perfil (visitante, dono e equipe) abre nos três viewports (`mobile`,
 * `tablet` e `desktop`, `playwright.config.ts`) e não pode:
 *
 *  - rolar na horizontal (`scrollWidth > clientWidth`);
 *  - cortar texto sem querer: um nó de texto maior que a caixa que o contém, sem `truncate` nem
 *    `line-clamp` intencional por cima;
 *  - ter violação `serious` ou `critical` do axe (`_standards/frontend.md` §11.2).
 *
 * A faixa de categorias da home rola na horizontal dentro do próprio componente de propósito, e
 * por isso a medida é a da página, não a de cada caixa.
 */

type Overflow = { horizontal: boolean; clipped: Array<string> }

/**
 * Mede a página: rolagem horizontal do documento e texto cortado. Um elemento corta texto
 * quando o conteúdo é maior que a caixa (`scrollWidth > clientWidth`) e a caixa esconde o
 * excesso (`overflow` diferente de `visible`) sem `text-overflow: ellipsis` nem `line-clamp`,
 * que são o corte intencional.
 */
function measure(page: Page): Promise<Overflow> {
  return page.evaluate(() => {
    const root = document.documentElement
    const clipped: Array<string> = []

    for (const element of document.body.querySelectorAll('*')) {
      if (!(element instanceof HTMLElement)) continue
      if (element.closest('.leaflet-container, svg, .rail, .sr-only')) {
        continue
      }
      if (element.offsetParent === null) continue

      const style = getComputedStyle(element)
      const hides =
        style.overflowX === 'hidden' ||
        style.overflowX === 'clip' ||
        style.overflowY === 'hidden' ||
        style.overflowY === 'clip'
      const intentional =
        style.textOverflow === 'ellipsis' ||
        style.webkitLineClamp !== 'none' ||
        style.display === '-webkit-box'
      const hasText = Array.from(element.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      )

      if (
        hides &&
        hasText &&
        !intentional &&
        element.scrollWidth > element.clientWidth + 1
      ) {
        clipped.push(
          `${element.tagName.toLowerCase()}.${element.className}: ${element.textContent.trim().slice(0, 40)}`,
        )
      }
    }

    return { horizontal: root.scrollWidth > root.clientWidth, clipped }
  })
}

async function expectFits(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await expect
    .poll(async () => (await measure(page)).horizontal, {
      message: 'a página rola na horizontal',
    })
    .toBe(false)
  expect((await measure(page)).clipped, 'texto cortado sem truncate').toEqual(
    [],
  )
}

for (const path of E2eScreens.visitor) {
  test(`o visitante abre ${path} sem rolagem horizontal, texto cortado nem violação do axe`, async ({
    page,
    expectNoBlockingViolations,
  }) => {
    const response = await page.goto(path)

    expect(response?.status()).toBe(200)
    await expectFits(page)
    await expectNoBlockingViolations()
  })
}

test('o visitante abre um anúncio que não existe e a página de 404 cabe', async ({
  page,
  errors,
  expectNoBlockingViolations,
}) => {
  // O navegador registra no console o 404 do próprio documento: é o que o teste provoca.
  errors.allow(/status of 404/)
  const response = await page.goto(E2eScreens.missing)

  expect(response?.status()).toBe(404)
  await expectFits(page)
  await expectNoBlockingViolations()
})

for (const path of E2eScreens.owner) {
  ownerTest(
    `o dono abre ${path} sem rolagem horizontal, texto cortado nem violação do axe`,
    async ({ page, expectNoBlockingViolations }) => {
      await page.goto(
        await E2eScreens.resolve(
          page.request,
          path,
          'Kitnet da responsividade',
        ),
      )
      await expectFits(page)
      await expectNoBlockingViolations()
    },
  )
}

for (const path of E2eScreens.staff) {
  staffTest(
    `a equipe abre ${path} sem rolagem horizontal, texto cortado nem violação do axe`,
    async ({ page, ownerPage, expectNoBlockingViolations }) => {
      await page.goto(
        await E2eScreens.resolve(
          ownerPage.request,
          path,
          'Kitnet da responsividade',
        ),
      )
      await expectFits(page)
      await expectNoBlockingViolations()
    },
  )
}
