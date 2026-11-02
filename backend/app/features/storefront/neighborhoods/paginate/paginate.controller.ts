import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { NEIGHBORHOOD_SORT_COLUMNS } from '@aporta/shared'

import StorefrontNeighborhoodPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { StorefrontNeighborhoodPaginateValidator } from '#validators/storefront/neighborhoods.validator'

@inject()
export default class StorefrontNeighborhoodPaginateController {
  static docs = defineDocs({
    description:
      'Os bairros que o filtro oferece, sem autenticação, em ordem alfabética. Cada um traz o ' +
      '`slug` (o endereço que `?neighborhood` aceita nos anúncios) e o centro aproximado, para o ' +
      'pino do mapa. `?search` filtra pelo nome.\n\n' +
      `\`?sort\` aceita ${NEIGHBORHOOD_SORT_COLUMNS.join(', ')} e \`?direction\` aceita asc ou desc.`,
  })

  constructor(
    private readonly useCase: StorefrontNeighborhoodPaginateUseCase,
  ) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      StorefrontNeighborhoodPaginateValidator,
    )
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
