import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorPlaceShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorPlaceShowController {
  static docs = defineDocs({
    description:
      'Um lugar do guia para a equipe, no ar ou arquivado, com a data de arquivamento.',
    errors: { 404: 'PLACE_NOT_FOUND' },
  })

  constructor(private readonly useCase: AdministratorPlaceShowUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
