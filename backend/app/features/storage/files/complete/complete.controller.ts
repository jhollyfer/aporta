import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StorageFileCompleteUseCase from './complete.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import StoragePolicy from '#policies/storage.policy'
import StorageRepository from '#repositories/storage/storage.repository'
import { StorageFileCompleteValidator } from '#validators/storage/files.validator'

@inject()
export default class StorageFileCompleteController {
  static docs = defineDocs({
    description:
      'Fecha o upload aberto por `POST /storages`: o bucket remonta as partes e a linha passa ' +
      'a `UPLOADED`, que é o único estado que pode ser anexado a alguma coisa.\n\n' +
      'O corpo traz o `ETag` que cada `PUT` de parte devolveu - é assim que o storage confere ' +
      'que nenhuma parte se perdeu ou chegou pela metade. Upload de parte única não tem parte ' +
      'para confirmar, e `parts` vem ausente.\n\n' +
      'É aqui que o tamanho **declarado** no `POST /storages` é comparado com o do objeto que ' +
      'de fato subiu. Divergiu, o objeto é apagado, a linha morre junto e a resposta é `422`. ' +
      'O tipo e o tamanho de cada `PUT` entram na assinatura da URL, e o bucket recusa o que ' +
      'não bater com ela. A assinatura não prova que os bytes são do tipo declarado nem o ' +
      'tamanho total de um upload em partes: o total é conferido aqui.\n\n' +
      'Também é aqui que o **conteúdo** é conferido: o `Content-Type` do objeto e os primeiros ' +
      'bytes (assinatura do formato) precisam ser os do `mimetype` declarado. Um `.png` com ' +
      'bytes de SVG é recusado com `422`, o objeto é apagado e a linha morre junto.\n\n' +
      'Chamar duas vezes é seguro: a segunda devolve o mesmo registro.',
  })

  constructor(
    private readonly files: StorageRepository,
    private readonly useCase: StorageFileCompleteUseCase,
  ) {}

  async handle(context: HttpContext) {
    const { id } = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const payload = await context.request.validateUsing(
      StorageFileCompleteValidator,
    )

    const storage = await this.files.findById(id)

    await context.bouncer.with(StoragePolicy).authorize('complete', storage)

    const result = await this.useCase.execute({ ...payload, id })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
