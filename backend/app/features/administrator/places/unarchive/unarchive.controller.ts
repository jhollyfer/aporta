import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorPlaceUnarchiveUseCase from './unarchive.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorPlaceUnarchiveController {
  static docs = defineDocs({
    summary: 'Restaurar um lugar arquivado',
    description:
      'Traz o lugar de volta da lixeira para o guia. Restaurar o que não está arquivado ' +
      'responde `409`.',
    errors: { 404: 'PLACE_NOT_FOUND' },
  })

  constructor(private readonly useCase: AdministratorPlaceUnarchiveUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
