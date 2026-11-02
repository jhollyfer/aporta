import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { LISTING_PINS_LIMIT } from '@aporta/shared'

import StorefrontListingPinsUseCase from './pins.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { StorefrontListingPinsValidator } from '#validators/storefront/listings.validator'

@inject()
export default class StorefrontListingPinsController {
  static docs = defineDocs({
    description:
      'Os pontos do mapa, sem autenticação: só o necessário para desenhar o pino e abrir o ' +
      'anúncio (`id`, `slug`, `type`, `lat`, `lng` e o preço). Sem fotos, sem contato do dono e ' +
      'sem paginação.\n\n' +
      'Aceita os mesmos filtros do catálogo (`?type`, `?neighborhood`, `?period`, `?minPrice`, ' +
      '`?maxPrice`, `?search`) e a janela do mapa: `?minLng`, `?minLat`, `?maxLng` e `?maxLat`, ' +
      'os quatro juntos ou nenhum, em graus decimais. Só volta o que cai dentro da janela.\n\n' +
      `Devolve no máximo ${LISTING_PINS_LIMIT} pontos, do anúncio mais recente para o mais ` +
      'antigo. `meta.total` é quantos anúncios casam no total: se for maior que o tamanho de ' +
      '`data`, a janela tem mais do que o mapa desenha e a tela deve pedir para aproximar.',
  })

  constructor(private readonly useCase: StorefrontListingPinsUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      StorefrontListingPinsValidator,
    )
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
