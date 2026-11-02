import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { TRASHED_MODE } from '@aporta/shared'

import StorageFileDeleteUseCase from './delete.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import StoragePolicy from '#policies/storage.policy'
import StorageRepository from '#repositories/storage/storage.repository'

@inject()
export default class StorageFileDeleteController {
  static docs = defineDocs({
    description:
      '**Irreversível**: apaga o binário no bucket e a linha em `storages`.\n\n' +
      'Só apaga arquivo **órfão**. O arquivo é um registro neutro e compartilhado - ele não ' +
      'pertence ao formulário que o enviou -, então quem o referencia é quem manda: avatar de ' +
      'usuário, capa de notícia ou galeria de álbum em uso respondem `409`, com a origem na ' +
      'mensagem. Desvincule primeiro, apague depois.\n\n' +
      'Arquivo ainda `PENDING` é cancelamento de upload: o multipart é abortado, e é isso que ' +
      'faz as partes já enviadas sumirem do bucket.\n\n' +
      'É o par do `POST /storages`, que grava o arquivo antes de o formulário ser salvo: sem ' +
      'esta rota, todo anexo escolhido e removido da tela ficaria no bucket para sempre.',
  })

  constructor(
    private readonly files: StorageRepository,
    private readonly useCase: StorageFileDeleteUseCase,
  ) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })

    // `WITH` the cancelled ones: deleting an already cancelled upload again is success, and the
    // policy has to see that row too, or the repeat would answer `404` to its own owner.
    const storage = await this.files.findById(payload.id, TRASHED_MODE.WITH)

    await context.bouncer.with(StoragePolicy).authorize('delete', storage)

    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
