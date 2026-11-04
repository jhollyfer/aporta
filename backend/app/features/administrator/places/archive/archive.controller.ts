import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorPlaceArchiveUseCase from './archive.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorPlaceArchiveController {
  static docs = defineDocs({
    summary: 'Arquivar um lugar do guia',
    description:
      'Tira o lugar do guia: ele vai para a lixeira, nenhuma leitura pública o devolve e a lista ' +
      'da equipe o mostra em `?trashed=only`.\n\n' +
      'Arquivar o que já foi arquivado responde `409`. Excluir de vez é outra ação, só do ' +
      'ADMINISTRATOR e só para o que já foi arquivado.',
    errors: { 404: 'PLACE_NOT_FOUND' },
  })

  constructor(private readonly useCase: AdministratorPlaceArchiveUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
