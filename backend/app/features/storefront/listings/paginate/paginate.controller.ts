import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { LISTING_SORT_COLUMNS } from '@aporta/shared'

import StorefrontListingPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { StorefrontListingPaginateValidator } from '#validators/storefront/listings.validator'

@inject()
export default class StorefrontListingPaginateController {
  static docs = defineDocs({
    description:
      'Catálogo público, sem autenticação. Só aparece anúncio `PUBLISHED` e não arquivado: ' +
      'rascunho, em análise e arquivado são inexistentes para o visitante, e não "indisponíveis".\n\n' +
      '`?type`, `?neighborhood` (o `slug` do bairro) e `?period` recortam; `?minPrice` e ' +
      '`?maxPrice` filtram pelo equivalente mensal do preço (o mensal, ou a diária vezes 30 para ' +
      'o hotel que só anuncia a diária). `?search` filtra por título e descrição. Não há ' +
      '`?status` nem `?trashed`.\n\n' +
      // The list comes from the tuple itself: written by hand, the documentation would start
      // promising a column the day someone removed it from the validator.
      `\`?sort\` aceita ${LISTING_SORT_COLUMNS.join(', ')} e \`?direction\` aceita asc ou desc. ` +
      'Padrão: página 1, 20 por página, do mais recente para o mais antigo.',
  })

  constructor(private readonly useCase: StorefrontListingPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      StorefrontListingPaginateValidator,
    )
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
