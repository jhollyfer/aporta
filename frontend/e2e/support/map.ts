import type { Locator, Page } from '@playwright/test'

/**
 * O primeiro pin do mapa. O pin é um `div role="button"` de tamanho zero (o Leaflet o ancora
 * pelo canto) com o preço desenhado dentro: o que se vê e se toca é o filho, então o teste
 * mira nele. O nome acessível do botão é esse mesmo preço (`R$ 900`), e o `title` traz o tipo.
 */
export class E2eMap {
  static readonly pinName = /^R\$/

  /**
   * O botão "Mostrar N imóveis" da barra de filtros: é React puro, então serve de sinal de
   * hidratação. Os botões de zoom são do Leaflet e nunca ganham as marcas do React.
   */
  static applyButton(page: Page): Locator {
    return page.getByRole('button', { name: /^Mostrar \d+ imóveis$/ })
  }

  static firstPin(page: Page): Locator {
    return page
      .getByRole('button', { name: E2eMap.pinName })
      .first()
      .getByText(E2eMap.pinName)
  }
}
