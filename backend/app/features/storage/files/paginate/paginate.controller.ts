import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { STORAGE_SORT_COLUMNS, STORAGE_MIMETYPES } from '@aporta/shared'

import StorageFilePaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { StorageFilePaginateValidator } from '#validators/storage/files.validator'

@inject()
export default class StorageFilePaginateController {
  static docs = defineDocs({
    description:
      'A biblioteca de arquivos. A equipe lê a coleção toda; o dono de imóvel lê só os arquivos ' +
      'que ele mesmo enviou, e o recorte é feito dentro da consulta, pela sessão, sem parâmetro ' +
      'de dono para forjar.\n\n' +
      '`?search` filtra por nome original, nome gerado e ' +
      'tipo, `?status` separa o que já subiu do upload em aberto, e `?mimetype` recorta um ' +
      'tipo só.\n\n' +
      // Both lists come from the tuples themselves: written by hand, the documentation
      // would start promising a value the day someone removed it from the validator.
      `\`?mimetype\` aceita ${STORAGE_MIMETYPES.join(', ')}.\n\n` +
      `\`?sort\` aceita ${STORAGE_SORT_COLUMNS.join(', ')} e \`?direction\` aceita asc ou desc. ` +
      'Padrão: página 1, 20 por página, do mais recente para o mais antigo - numa biblioteca ' +
      'de arquivos o que interessa é o que acabou de subir.',
  })

  constructor(private readonly useCase: StorageFilePaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      StorageFilePaginateValidator,
    )
    const result = await this.useCase.execute({
      ...payload,
      actor: context.actor,
    })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
