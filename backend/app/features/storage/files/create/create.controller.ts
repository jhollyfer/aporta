import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { STORAGE_MIMETYPES } from '@aporta/shared'

import StorageFileCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { PART_SIZE } from '#services/multipart/multipart.contract'
import {
  StorageFileCreateValidator,
  UPLOAD_MAX_SIZE,
} from '#validators/storage/files.validator'

@inject()
export default class StorageFileCreateController {
  static docs = defineDocs({
    description:
      'Abre um upload e devolve por onde subi-lo. **Não recebe bytes** - só os metadados do ' +
      'arquivo.\n\n' +
      'O binário vai do navegador direto ao bucket, por URL assinada, e nunca atravessa esta ' +
      'aplicação: um arquivo grande num corpo HTTP esbarra no limite do proxy, ocupa a ' +
      'aplicação pelo tempo do upload, e não tem como ser retomado quando a conexão cai.\n\n' +
      `Aceita ${STORAGE_MIMETYPES.join(', ')}, até ${UPLOAD_MAX_SIZE} bytes, recusados **antes** ` +
      'de qualquer assinatura: arquivo proibido não ganha URL, então não chega ao bucket. Que o ' +
      'tamanho declarado seja verdade é o que `POST /storages/:id/complete` confere, contra o ' +
      'objeto real.\n\n' +
      `O arquivo é fatiado em partes de ${PART_SIZE} bytes. Quando cabe numa parte só, ` +
      '`uploadId` vem nulo e a única URL aceita um `PUT` com o arquivo inteiro. Quando não ' +
      'cabe, cada URL aceita a sua parte, o cliente guarda o `ETag` que cada `PUT` devolve, e ' +
      '`parts` pode trazer só o primeiro lote - o resto sai em `GET /storages/:id/parts`, que ' +
      'é o mesmo endpoint da retomada.\n\n' +
      'A linha nasce `PENDING` e não pode ser anexada a nada até ser confirmada. O arquivo ' +
      'nasce com dono, a conta autenticada que abriu o upload (não existe upload anônimo); ' +
      'quem anexa guarda a referência, informando o `id` em `avatarId`, `coverId`, `audioId` ' +
      'ou `imageIds`.',
  })

  constructor(private readonly useCase: StorageFileCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      StorageFileCreateValidator,
    )
    const result = await this.useCase.execute({
      ...payload,
      actor: context.actor,
    })
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
