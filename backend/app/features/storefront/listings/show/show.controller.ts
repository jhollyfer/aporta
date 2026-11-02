import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StorefrontListingShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { StorefrontListingShowValidator } from '#validators/storefront/listings.validator'

@inject()
export default class StorefrontListingShowController {
  static docs = defineDocs({
    description:
      'Leitura pública pelo `slug`, que é o identificador que a URL da vitrine carrega.\n\n' +
      'Anúncio em rascunho, em análise, arquivado ou inexistente responde o mesmo `404`, nunca ' +
      '`403`: a vitrine não confirma a existência do que não está no ar.',
  })

  constructor(private readonly useCase: StorefrontListingShowUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      StorefrontListingShowValidator,
      { data: context.params },
    )
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
