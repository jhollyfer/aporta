import type { Page } from '@playwright/test'

import { E2eScreens } from './support/screens'
import { expect, ownerTest, staffTest, test } from './support/test'

/**
 * Alvo de toque de 44px no celular (`_standards/frontend.md` §10.2, DECISIONS #267). Só roda
 * no projeto `mobile` (`playwright.config.ts`): mede cada controle interativo das telas
 * principais de cada perfil e reprova o que tiver lado menor que 44px.
 *
 * O alvo vem do kit (`components/common/`), nunca de ajuste por tela; se um controle novo
 * falha aqui, o conserto é no componente dele.
 *
 * Exceções, todas justificadas:
 *  - link no meio de texto corrido (WCAG 2.5.8, "inline"): a altura é a da linha;
 *  - `input` de marcar (checkbox e radio) ou escondido (`sr-only`): o alvo é o `<label>` dele, e é ele que se mede;
 *  - o link de atribuição do mapa (Leaflet) e o pin de preço: o pin tem a área de toque ampliada
 *    por `::before` (`styles.css`), que a caixa do elemento não mostra;
 *  - o link "pular para o conteúdo", que só aparece com o foco.
 */
const MIN = 44

const TARGETS =
  'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"], summary'

type Small = { selector: string; width: number; height: number }

function findSmall(page: Page): Promise<Array<Small>> {
  return page.evaluate(
    ({ selector, min }) => {
      const small: Array<Small> = []

      for (const element of document.querySelectorAll(selector)) {
        if (!(element instanceof HTMLElement)) continue
        if (element.closest('.leaflet-control-attribution, .price-pin'))
          continue
        if (element.matches('a[href^="#"]')) continue

        let measured: HTMLElement = element
        const type = element.getAttribute('type')

        // Marcar/escolher: o alvo é o `<label>` que o envolve. Vale também para o `input` visualmente
        // escondido (`sr-only`, como o seletor de arquivo), cujo alvo é o rótulo-botão ao lado.
        const own = element.getBoundingClientRect()

        if (
          element instanceof HTMLInputElement &&
          (type === 'checkbox' || type === 'radio' || own.width <= 1)
        ) {
          const label = element.closest('label') ?? element.labels?.[0]

          if (label instanceof HTMLElement) measured = label
        }

        const box = measured.getBoundingClientRect()

        if (box.width === 0 || box.height === 0) continue
        if (getComputedStyle(measured).visibility === 'hidden') continue

        // Link no meio de um parágrafo: o texto em volta é do mesmo bloco.
        if (
          measured.tagName === 'A' &&
          getComputedStyle(measured).display === 'inline'
        ) {
          const block = measured.parentElement
          const around = Array.from(block?.childNodes ?? []).some(
            (node) =>
              node !== measured &&
              node.nodeType === Node.TEXT_NODE &&
              node.textContent?.trim(),
          )

          if (around) continue
        }

        if (box.width < min || box.height < min) {
          small.push({
            selector: `${measured.tagName.toLowerCase()}[${(measured.getAttribute('aria-label') ?? measured.textContent).trim().slice(0, 30)}]`,
            width: Math.round(box.width),
            height: Math.round(box.height),
          })
        }
      }

      return small
    },
    { selector: TARGETS, min: MIN },
  )
}

async function expectTargets(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  expect(
    (await findSmall(page)).map(
      ({ selector, width, height }) => `${selector} ${width}x${height}`,
    ),
  ).toEqual([])
}

for (const path of E2eScreens.visitor) {
  test(`o visitante vê os controles de ${path} com 44px ou mais`, async ({
    page,
  }) => {
    await page.goto(path)
    await expectTargets(page)
  })
}

for (const path of E2eScreens.owner) {
  ownerTest(
    `o dono vê os controles de ${path} com 44px ou mais`,
    async ({ page }) => {
      await page.goto(
        await E2eScreens.resolve(page.request, path, 'Kitnet do toque'),
      )
      await expectTargets(page)
    },
  )
}

for (const path of E2eScreens.staff) {
  staffTest(
    `a equipe vê os controles de ${path} com 44px ou mais`,
    async ({ page, ownerPage }) => {
      await page.goto(
        await E2eScreens.resolve(ownerPage.request, path, 'Kitnet do toque'),
      )
      await expectTargets(page)
    },
  )
}
