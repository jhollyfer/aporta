import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { PLACE_CATEGORIES, PLACE_SORT_COLUMNS } from '@aporta/shared'

import StorefrontPlacePaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { StorefrontPlacePaginateValidator } from '#validators/storefront/places.validator'

@inject()
export default class StorefrontPlacePaginateController {
  static docs = defineDocs({
    description:
      'O guia da cidade, sem autenticação, em ordem alfabética. `?category` escolhe a aba ' +
      `(${PLACE_CATEGORIES.join(', ')}) e \`?search\` filtra por nome e descrição.\n\n` +
      `\`?sort\` aceita ${PLACE_SORT_COLUMNS.join(', ')} e \`?direction\` aceita asc ou desc.`,
  })

  constructor(private readonly useCase: StorefrontPlacePaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      StorefrontPlacePaginateValidator,
    )
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
