import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { LISTING_PHOTO_MAX_SIZE, LISTING_PHOTOS_MAX } from '@aporta/shared'

import OwnerListingPhotoCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import ListingPolicy from '#policies/listing.policy'
import ListingRepository from '#repositories/listing/listing.repository'
import { OwnerListingPhotoCreateValidator } from '#validators/owner/listing-photos.validator'

@inject()
export default class OwnerListingPhotoCreateController {
  static docs = defineDocs({
    summary: 'Anexar fotos ao anúncio',
    description:
      'Liga arquivos **já enviados** (`POST /storages` e `complete`) ao anúncio, cada um ao ' +
      'ambiente que mostra, no fim da galeria e na ordem do corpo. O binário não passa por aqui: ' +
      'só a chave `storageId` da linha de `storages`.\n\n' +
      'Cada arquivo precisa estar `UPLOADED` e ter sido enviado pela conta da sessão. Arquivo de ' +
      'outra conta, ainda `PENDING` ou inexistente responde o mesmo `422` `STORAGE_NOT_FOUND`, ' +
      'para não confirmar a quem sonda que aquele uuid existe.\n\n' +
      `A foto é JPEG, PNG ou WebP (\`LISTING_PHOTO_TYPE_INVALID\`) e tem até ${LISTING_PHOTO_MAX_SIZE / (1024 * 1024)} MB ` +
      '(`LISTING_PHOTO_TOO_LARGE`), ambos `422`: o envio genérico (`POST /storages`) aceita mais ' +
      'tipos e um teto maior, e é aqui, ao anexar, que se sabe que o arquivo vira foto.\n\n' +
      `O anúncio aceita até ${LISTING_PHOTOS_MAX} fotos no total, contando as que já tem, e não ` +
      'aceita o mesmo arquivo duas vezes. Responde `201` com o anúncio inteiro, fotos na ordem e ' +
      'com a URL assinada de leitura.\n\n' +
      'Anúncio de outra conta responde o mesmo `404` do que não existe.',
    // Declared by hand because the `404` is born from the `ListingPolicy` besides the use-case.
    errors: { 404: 'LISTING_NOT_FOUND' },
  })

  constructor(
    private readonly listings: ListingRepository,
    private readonly useCase: OwnerListingPhotoCreateUseCase,
  ) {}

  async handle(context: HttpContext) {
    const { id } = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const payload = await context.request.validateUsing(
      OwnerListingPhotoCreateValidator,
    )

    const listing = await this.listings.findById(id)

    await context.bouncer.with(ListingPolicy).authorize('attachPhotos', listing)

    const result = await this.useCase.execute({
      ...payload,
      id,
      actor: context.actor,
    })
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
