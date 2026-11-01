import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StorageFileDownloadUseCase from './download.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import StoragePolicy from '#policies/storage.policy'
import StorageRepository from '#repositories/storage/storage.repository'

@inject()
export default class StorageFileDownloadController {
  static docs = defineDocs({
    description:
      'Redireciona para uma URL temporária do bucket que entrega o arquivo com ' +
      '`Content-Disposition: attachment` e o nome original.\n\n' +
      'Existe por uma limitação do navegador, não do storage: o atributo `download` de um ' +
      '`<a>` é ignorado entre origens, e a API responde numa origem diferente da do app. Sem ' +
      'esta rota, "salvar arquivo" abriria a imagem numa aba, e o arquivo chegaria nomeado ' +
      'com o uuid em vez do nome que a pessoa enviou.\n\n' +
      'Redireciona em vez de servir o binário: o header viaja assinado dentro da URL, então a ' +
      'aplicação entrega um endereço e sai do caminho, em vez de ficar ocupada pelo tempo da ' +
      'transferência de cada download.\n\n' +
      '**Exige sessão**: o bucket é `visibility: private`, e enquanto esta rota ficou aberta ' +
      'ela emitia URL assinada para qualquer uuid sem sessão - a porta dos fundos que o ' +
      'fechamento do bucket deixou aberta. Arquivo que a pessoa não alcança responde `404` e ' +
      'não `403`, para não confirmar a quem sonda que aquele uuid existe.',
    responses: { 302: 'no-content' },
    // Declared by hand because the `404` is born from the `StoragePolicy` besides the use-case.
    errors: { 404: 'STORAGE_NOT_FOUND' },
  })

  constructor(
    private readonly files: StorageRepository,
    private readonly useCase: StorageFileDownloadUseCase,
  ) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })

    // The record comes from the repository contract, and the policy decides on it
    // via `ctx.bouncer` (`_standards/backend.md` §4.6); never `*OrFail`. A missing
    // file and someone else's file answer the same `404`: a `403` would confirm
    // to whoever probes that this uuid exists.
    const storage = await this.files.findById(payload.id)

    await context.bouncer.with(StoragePolicy).authorize('download', storage)

    const result = await this.useCase.execute({ storageId: payload.id })

    if (result.isLeft()) throw result.value

    return context.response.redirect(result.value)
  }
}
