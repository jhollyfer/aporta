import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorListingArchiveUseCase from './archive.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorListingArchiveController {
  static docs = defineDocs({
    description:
      'A equipe tira do ar qualquer anúncio, em qualquer estado (um golpe confirmado não espera a ' +
      'fila). O estado vira `ARCHIVED` e o anúncio vai para a lixeira, na mesma transição: ' +
      'nenhuma leitura pública ou do dono o devolve, e a lista da equipe ainda o mostra.\n\n' +
      'Arquivar o que já foi arquivado responde `409`. Excluir de vez é outra ação, só do ' +
      'ADMINISTRATOR e só para o que já foi arquivado.',
    errors: { 404: 'LISTING_NOT_FOUND' },
  })

  constructor(private readonly useCase: AdministratorListingArchiveUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
