import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorListingShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorListingShowController {
  static docs = defineDocs({
    description:
      'Um anúncio para a equipe revisar, em qualquer estado, inclusive arquivado, com a conta do ' +
      'dono, as fotos com URL assinada e a última decisão da equipe.',
  })

  constructor(private readonly useCase: AdministratorListingShowUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
