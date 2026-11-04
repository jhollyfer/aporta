import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorPlaceDeleteUseCase from './delete.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorPlaceDeleteController {
  static docs = defineDocs({
    summary: 'Excluir um lugar do guia de vez',
    description:
      'Apaga o lugar **sem volta**. Só o ADMINISTRATOR pode (o moderador recebe `403`) e só o que ' +
      'já foi arquivado: um lugar no guia responde `409` e precisa ser arquivado antes.',
    errors: { 404: 'PLACE_NOT_FOUND' },
  })

  constructor(private readonly useCase: AdministratorPlaceDeleteUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
