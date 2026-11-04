import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorPlaceUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import { AdministratorPlaceWriteValidator } from '#validators/administrator/places.validator'

@inject()
export default class AdministratorPlaceUpdateController {
  static docs = defineDocs({
    summary: 'Editar um lugar do guia',
    description:
      'Substitui o que a equipe edita num lugar: o corpo leva todos os campos, os mesmos da ' +
      'criação, porque `category` e `date` dependem um do outro (tirar um lugar de `EVENT` sem ' +
      'tirar a data responde `422`). Vale também para o lugar arquivado, que continua arquivado.',
    errors: { 404: 'PLACE_NOT_FOUND' },
  })

  constructor(private readonly useCase: AdministratorPlaceUpdateUseCase) {}

  async handle(context: HttpContext) {
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const payload = await context.request.validateUsing(
      AdministratorPlaceWriteValidator,
    )
    const result = await this.useCase.execute({ ...payload, ...params })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
