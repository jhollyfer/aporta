import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StorageFileShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import StoragePolicy from '#policies/storage.policy'
import StorageRepository from '#repositories/storage/storage.repository'

@inject()
export default class StorageFileShowController {
  static docs = defineDocs({
    description:
      'Devolve o registro nu, sem envelope: o rótulo original, o tipo, o tamanho, o estado do ' +
      'upload e a `url` derivada.\n\n' +
      'Vale também para o arquivo ainda `PENDING` - a tela de detalhe é onde se descobre que ' +
      'um upload ficou pela metade. Quem anexa é que exige `UPLOADED`.\n\n' +
      'O dono de imóvel só alcança os arquivos que ele mesmo enviou; o de outra conta responde ' +
      'o mesmo `404` do que não existe.',
    // Declared by hand because the `404` is born from the `StoragePolicy` besides the use-case.
    errors: { 404: 'STORAGE_NOT_FOUND' },
  })

  constructor(
    private readonly files: StorageRepository,
    private readonly useCase: StorageFileShowUseCase,
  ) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })

    // The policy decides on the record read through the contract (`_standards/backend.md`
    // §4.6): the staff reaches any file, an owner of properties only the ones he sent, and
    // someone else's answers the same `404` as a missing one.
    const storage = await this.files.findById(payload.id)

    await context.bouncer.with(StoragePolicy).authorize('show', storage)

    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
