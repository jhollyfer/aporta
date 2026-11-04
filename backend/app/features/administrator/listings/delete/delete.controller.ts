import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorListingDeleteUseCase from './delete.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorListingDeleteController {
  static docs = defineDocs({
    summary: 'Excluir um anúncio de vez',
    description:
      'Apaga o anúncio e a galeria **sem volta**. Só o ADMINISTRATOR pode (o moderador recebe ' +
      '`403`) e só o que já foi arquivado: um anúncio no ar ou na fila responde `409` e precisa ' +
      'ser arquivado antes.\n\n' +
      'Anúncio com denúncia, aberta ou resolvida, não é apagado (`409`): a denúncia e a decisão ' +
      'são registro e ficam ligadas a ele.\n\n' +
      'Depois da exclusão, o arquivo de cada foto só sai do bucket se **nenhuma outra** foto ou ' +
      'conta o referenciar (imagens do catálogo de demonstração são compartilhadas). Se o bucket ' +
      'falhar, o anúncio continua excluído e a varredura de órfãos termina o trabalho depois.',
    errors: { 404: 'LISTING_NOT_FOUND' },
  })

  constructor(private readonly useCase: AdministratorListingDeleteUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })

    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
